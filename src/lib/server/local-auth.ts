import { UserRole, UserStatus, type User } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/server/passwords";
import { awardReward } from "@/lib/server/rewards";
import type { Actor } from "@/types/domain";

export const localSessionCookieName = "ihw_session";
export const localSessionMaxAgeSeconds = 60 * 60 * 24 * 30;

export type LocalAuthResult =
  | { mode: "ok"; actor: Actor; token: string; maxAge: number }
  | { mode: "invalid" | "inactive" | "conflict" | "error" };

export async function signInWithPassword(email: string, password: string): Promise<LocalAuthResult> {
  try {
    const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
    if (!user || !await verifyPassword(password, user.passwordHash)) return { mode: "invalid" };
    if (user.status !== UserStatus.ACTIVE) return { mode: "inactive" };

    return createSessionResult(user);
  } catch {
    return { mode: "error" };
  }
}

export async function registerBuyerWithPassword(input: {
  displayName: string;
  email: string;
  password: string;
}): Promise<LocalAuthResult> {
  try {
    const email = normalizeEmail(input.email);
    const passwordHash = await hashPassword(input.password);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          displayName: input.displayName.trim(),
          handle: await uniqueHandle(email.split("@")[0]),
          passwordHash,
          role: UserRole.BUYER,
          status: UserStatus.ACTIVE
        }
      });

      await awardReward(tx, {
        userId: created.id,
        type: "ACCOUNT_CREATED",
        sourceId: created.id
      });

      return created;
    });

    return createSessionResult(user);
  } catch (error) {
    if (isUniqueConstraintError(error)) return { mode: "conflict" };
    return { mode: "error" };
  }
}

export async function getActorFromLocalSession(token: string | undefined): Promise<Actor | null> {
  if (!token) return null;

  try {
    const session = await prisma.authSession.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: true }
    });
    if (!session || session.expiresAt.getTime() <= Date.now()) return null;
    if (session.user.status !== UserStatus.ACTIVE) return null;

    return actorFromUser(session.user);
  } catch {
    return null;
  }
}

export async function deleteLocalSession(token: string | undefined) {
  if (!token) return;

  try {
    await prisma.authSession.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
  } catch {
    // Logout should still clear the browser cookie when the database delete fails.
  }
}

export async function deleteExpiredLocalSessions(now = new Date()) {
  await prisma.authSession.deleteMany({ where: { expiresAt: { lte: now } } });
}

export function actorFromUser(user: Pick<User, "id" | "email" | "displayName" | "handle" | "role">): Actor {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    handle: user.handle,
    role: user.role,
    avatarInitials: initials(user.displayName),
    isAuthenticated: true,
    authProvider: "local"
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function createSessionResult(user: User): Promise<Extract<LocalAuthResult, { mode: "ok" }>> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + localSessionMaxAgeSeconds * 1000);
  await prisma.authSession.create({
    data: {
      userId: user.id,
      tokenHash: hashSessionToken(token),
      expiresAt
    }
  });

  return {
    mode: "ok",
    actor: actorFromUser(user),
    token,
    maxAge: localSessionMaxAgeSeconds
  };
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function uniqueHandle(input: string) {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28) || "user";

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const handle = attempt === 0 ? base : `${base}-${randomBytes(2).toString("hex")}`;
    const existing = await prisma.user.findUnique({ where: { handle }, select: { id: true } });
    if (!existing) return handle;
  }

  return `${base}-${randomBytes(4).toString("hex")}`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}
