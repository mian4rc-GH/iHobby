import { cookies } from "next/headers";
import { coerceRole } from "@/lib/rbac";
import { getActorFromLocalSession, localSessionCookieName } from "@/lib/server/local-auth";
import { upsertUserFromClerk } from "@/lib/server/users";
import type { Actor, Role } from "@/types/domain";

const visitorActor: Actor = {
  id: "visitor",
  email: "",
  displayName: "Guest",
  handle: "guest",
  role: "VISITOR",
  avatarInitials: "GU",
  isAuthenticated: false,
  authProvider: "visitor"
};

export function isClerkAuthConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}

export async function getCurrentActor(): Promise<Actor> {
  const cookieStore = await cookies();

  if (!isClerkAuthConfigured()) {
    const actor = await getActorFromLocalSession(cookieStore.get(localSessionCookieName)?.value);
    return actor ?? visitorActor;
  }

  try {
    const { auth, currentUser } = await import("@clerk/nextjs/server");
    const session = await auth();
    const clerkUser = await currentUser();
    const metadata = session.sessionClaims?.metadata as { role?: unknown } | undefined;
    const fallbackRole = coerceRole(String(metadata?.role ?? "BUYER"));

    if (!clerkUser?.primaryEmailAddress?.emailAddress) {
      return visitorActor;
    }

    const displayName = clerkUser.fullName ?? clerkUser.username ?? "iHobbyWorld member";
    const user = await upsertUserFromClerk({
      clerkId: clerkUser.id,
      email: clerkUser.primaryEmailAddress.emailAddress,
      displayName,
      handle: clerkUser.username,
      role: fallbackRole
    });

    if (user.status !== "ACTIVE") {
      return visitorActor;
    }

    return {
      id: clerkUser.id,
      email: user.email,
      displayName: user.displayName,
      handle: user.handle,
      role: user.role as Role,
      avatarInitials: initials(user.displayName),
      isAuthenticated: true,
      authProvider: "clerk"
    };
  } catch {
    return visitorActor;
  }
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
