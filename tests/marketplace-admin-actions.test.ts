import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  listAdminAuditLogs,
  listAdminCategories,
  sendListingMessage,
  updateUserProfileAsAdmin,
  updateUserRoleAsAdmin,
  updateUserStatusAsAdmin
} from "@/lib/server/marketplace";
import { prisma } from "@/lib/prisma";
import { ensureUserForActor, syncClerkRole, syncClerkStatus } from "@/lib/server/users";
import type { Actor } from "@/types/domain";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    },
    auditLog: {
      findMany: vi.fn(),
      create: vi.fn()
    },
    hobbyCategory: {
      findMany: vi.fn()
    },
    listing: {
      findUnique: vi.fn()
    },
    conversation: {
      create: vi.fn()
    }
  }
}));

vi.mock("@/lib/server/users", () => ({
  ensureUserForActor: vi.fn(),
  syncClerkRole: vi.fn(),
  syncClerkStatus: vi.fn()
}));

vi.mock("@/lib/server/notifications", () => ({
  createNotification: vi.fn()
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
  escapeHtml: (value: string) => value
}));

const adminActor: Actor = {
  id: "demo-admin",
  email: "admin@ihobbyworld.local",
  displayName: "Admin Team",
  handle: "admin",
  role: "ADMIN",
  avatarInitials: "AD",
  isAuthenticated: true,
  authProvider: "demo"
};

const sellerActor: Actor = {
  id: "demo-seller",
  email: "seller@ihobbyworld.local",
  displayName: "Skywright Kit Co.",
  handle: "skywright",
  role: "SELLER",
  avatarInitials: "SK",
  isAuthenticated: true,
  authProvider: "demo"
};

describe("marketplace admin and messaging actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ensureUserForActor).mockResolvedValue({
      id: "demo-admin",
      email: "admin@ihobbyworld.local",
      displayName: "Admin Team",
      handle: "admin",
      role: "ADMIN"
    } as never);
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({ id: "audit-1" } as never);
  });

  it("syncs Clerk metadata after admin role changes", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "target-user",
      clerkId: "clerk-target",
      role: "BUYER"
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({ id: "target-user", role: "SELLER" } as never);

    const result = await updateUserRoleAsAdmin(adminActor, "target-user", "SELLER");

    expect(result).toEqual({ mode: "ok" });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "target-user" },
      data: { role: "SELLER" }
    });
    expect(syncClerkRole).toHaveBeenCalledWith("clerk-target", "SELLER");
  });

  it("syncs Clerk metadata after admin status changes", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "target-user",
      clerkId: "clerk-target",
      status: "ACTIVE"
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({ id: "target-user", status: "SUSPENDED" } as never);

    const result = await updateUserStatusAsAdmin(adminActor, "target-user", "SUSPENDED");

    expect(result).toEqual({ mode: "ok" });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "target-user" },
      data: { status: "SUSPENDED" }
    });
    expect(syncClerkStatus).toHaveBeenCalledWith("clerk-target", "SUSPENDED");
  });

  it("prevents admins from demoting themselves", async () => {
    const result = await updateUserRoleAsAdmin(adminActor, "demo-admin", "BUYER");

    expect(result).toEqual({ mode: "forbidden" });
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(syncClerkRole).not.toHaveBeenCalled();
  });

  it("can close user accounts and sync Clerk status metadata", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "target-user",
      clerkId: "clerk-target",
      status: "ACTIVE"
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({ id: "target-user", status: "CLOSED" } as never);

    const result = await updateUserStatusAsAdmin(adminActor, "target-user", "CLOSED");

    expect(result).toEqual({ mode: "ok" });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "target-user" },
      data: { status: "CLOSED" }
    });
    expect(syncClerkStatus).toHaveBeenCalledWith("clerk-target", "CLOSED");
  });

  it("updates user profiles after checking email and handle conflicts", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "target-user",
      displayName: "Old Name",
      handle: "old-handle",
      email: "old@example.com"
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: "target-user",
      displayName: "New Name",
      handle: "new-handle",
      email: "new@example.com"
    } as never);

    const result = await updateUserProfileAsAdmin(adminActor, "target-user", {
      displayName: " New Name ",
      handle: "NEW-HANDLE",
      email: "NEW@example.com"
    });

    expect(result).toEqual({ mode: "ok" });
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: { not: "target-user" },
        OR: [{ email: "new@example.com" }, { handle: "new-handle" }]
      },
      select: { id: true }
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "target-user" },
      data: {
        displayName: "New Name",
        handle: "new-handle",
        email: "new@example.com"
      }
    });
  });

  it("lists inactive categories for admin category management", async () => {
    vi.mocked(prisma.hobbyCategory.findMany).mockResolvedValue([
      {
        id: "cat-1",
        slug: "rc-drones",
        name: "Drones",
        description: "Quadcopters and drone kits",
        attributes: { required: ["brand"], optional: ["batteryCount"] },
        active: false,
        createdAt: new Date("2026-07-01T10:00:00.000Z"),
        _count: { listings: 3 }
      }
    ] as never);

    const rows = await listAdminCategories();

    expect(rows).toEqual([
      {
        id: "cat-1",
        slug: "drones",
        name: "Drones",
        description: "Quadcopters and drone kits",
        attributes: { required: ["brand"], optional: ["batteryCount"] },
        active: false,
        listingCount: 3,
        createdAt: "2026-07-01T10:00:00.000Z"
      }
    ]);
  });

  it("maps persisted audit logs for the admin audit screen", async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
      {
        id: "audit-1",
        action: "user.profile_updated",
        entity: "User",
        entityId: "target-user",
        metadata: { emailChanged: true },
        createdAt: new Date("2026-07-01T12:00:00.000Z"),
        actor: {
          displayName: "Admin Team",
          email: "admin@ihobbyworld.local",
          role: "ADMIN"
        }
      }
    ] as never);

    const rows = await listAdminAuditLogs(10);

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: { createdAt: "desc" },
      take: 10
    }));
    expect(rows).toEqual([
      {
        id: "audit-1",
        action: "user.profile_updated",
        entity: "User",
        entityId: "target-user",
        actorName: "Admin Team",
        actorEmail: "admin@ihobbyworld.local",
        actorRole: "ADMIN",
        metadataSummary: "{\"emailChanged\":true}",
        createdAt: "2026-07-01T12:00:00.000Z"
      }
    ]);
  });

  it("rejects seller messages to their own listing before creating a conversation", async () => {
    vi.mocked(ensureUserForActor).mockResolvedValueOnce({
      id: "demo-seller",
      email: "seller@ihobbyworld.local",
      displayName: "Skywright Kit Co.",
      handle: "skywright",
      role: "SELLER"
    } as never);
    vi.mocked(prisma.listing.findUnique).mockResolvedValue({
      id: "listing-1",
      sellerId: "demo-seller",
      title: "Autel EVO Lite+",
      seller: { email: "seller@ihobbyworld.local" }
    } as never);

    const result = await sendListingMessage(sellerActor, "listing-1", "Is this still available?");

    expect(result).toEqual({ mode: "rejected", reason: "Seller cannot message their own listing." });
    expect(prisma.conversation.create).not.toHaveBeenCalled();
  });
});
