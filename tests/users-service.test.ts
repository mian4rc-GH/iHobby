import { beforeEach, describe, expect, it, vi } from "vitest";
import { upsertUserFromClerk } from "@/lib/server/users";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    user: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn()
    },
    loyaltyEvent: {
      upsert: vi.fn()
    },
    creditLedgerEntry: {
      upsert: vi.fn()
    }
  }
}));

describe("user sync service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(prisma as never) as never);
  });

  it("preserves existing local role and status when Clerk profile data changes", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue({
      id: "user-1",
      clerkId: "clerk-1",
      email: "member@example.com",
      displayName: "Existing Member",
      role: "ADMIN",
      status: "SUSPENDED"
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({
      id: "user-1",
      clerkId: "clerk-1",
      email: "member@example.com",
      displayName: "Updated Member",
      role: "ADMIN",
      status: "SUSPENDED"
    } as never);

    await upsertUserFromClerk({
      clerkId: "clerk-1",
      email: "member@example.com",
      displayName: "Updated Member",
      handle: "updated",
      role: "BUYER"
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        clerkId: "clerk-1",
        email: "member@example.com",
        displayName: "Updated Member"
      }
    });
  });

  it("awards the welcome reward only when Clerk creates a user", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValue({ id: "user-2" } as never);

    await upsertUserFromClerk({
      clerkId: "clerk-2",
      email: "new@example.com",
      displayName: "New Member"
    });

    expect(prisma.loyaltyEvent.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ userId: "user-2", points: 100, rewardKey: "ACCOUNT_CREATED:user-2" })
    }));
    expect(prisma.creditLedgerEntry.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ userId: "user-2", amount: 100, rewardKey: "ACCOUNT_CREATED:user-2" })
    }));
  });
});
