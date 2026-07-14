import { UserRole, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { coerceRole } from "@/lib/rbac";
import { awardReward } from "@/lib/server/rewards";
import type { Actor, Role } from "@/types/domain";

export interface ClerkUserPayload {
  clerkId: string;
  email: string;
  displayName: string;
  handle?: string | null;
  role?: unknown;
}

export async function upsertUserFromClerk(payload: ClerkUserPayload) {
  const role = coerceRole(String(payload.role ?? "BUYER"));
  const handle = safeHandle(payload.handle ?? payload.email.split("@")[0], payload.clerkId);
  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findFirst({
      where: {
        OR: [{ clerkId: payload.clerkId }, { email: payload.email }]
      }
    });

    if (existing) {
      return tx.user.update({
        where: { id: existing.id },
        data: {
          clerkId: payload.clerkId,
          email: payload.email,
          displayName: payload.displayName
        }
      });
    }

    const user = await tx.user.create({
      data: {
        clerkId: payload.clerkId,
        email: payload.email,
        displayName: payload.displayName,
        handle,
        role: role as UserRole
      }
    });
    await awardReward(tx, {
      userId: user.id,
      type: "ACCOUNT_CREATED",
      sourceId: user.id
    });
    return user;
  });
}

export async function closeUserByClerkId(clerkId: string) {
  return prisma.user.updateMany({
    where: { clerkId },
    data: { status: UserStatus.CLOSED }
  });
}

export async function ensureUserForActor(actor: Actor) {
  if (!actor.isAuthenticated || actor.role === "VISITOR") {
    throw new Error("Authenticated account required.");
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        actor.authProvider === "clerk" ? { clerkId: actor.id } : { id: actor.id },
        actor.email ? { email: actor.email } : undefined
      ].filter(Boolean) as Array<{ clerkId: string } | { id: string } | { email: string }>
    }
  });

  if (existing) return existing;

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        clerkId: actor.authProvider === "clerk" ? actor.id : null,
        email: actor.email,
        displayName: actor.displayName,
        handle: safeHandle(actor.handle, actor.id),
        role: actor.role as UserRole
      }
    });
    await awardReward(tx, {
      userId: user.id,
      type: "ACCOUNT_CREATED",
      sourceId: user.id
    });
    return user;
  });
}

export async function syncClerkRole(clerkId: string | null | undefined, role: Exclude<Role, "VISITOR">) {
  if (!clerkId || !process.env.CLERK_SECRET_KEY) return;

  const { clerkClient } = await import("@clerk/nextjs/server");
  const client = await clerkClient();
  await client.users.updateUserMetadata(clerkId, {
    publicMetadata: { role }
  });
}

export async function syncClerkStatus(clerkId: string | null | undefined, status: UserStatus) {
  if (!clerkId || !process.env.CLERK_SECRET_KEY) return;

  const { clerkClient } = await import("@clerk/nextjs/server");
  const client = await clerkClient();
  await client.users.updateUserMetadata(clerkId, {
    publicMetadata: { status }
  });
}

function safeHandle(input: string, suffix: string) {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return `${base || "user"}-${suffix.slice(-6).toLowerCase()}`;
}
