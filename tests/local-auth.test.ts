import { UserRole, UserStatus, type User } from "@prisma/client";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  getActorFromLocalSession,
  registerBuyerWithPassword,
  signInWithPassword
} from "@/lib/server/local-auth";
import { hashPassword } from "@/lib/server/passwords";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    user: {
      findUnique: vi.fn(),
      create: vi.fn()
    },
    authSession: {
      create: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn()
    },
    loyaltyEvent: {
      upsert: vi.fn()
    },
    creditLedgerEntry: {
      upsert: vi.fn()
    }
  }
}));

const prismaMock = prisma as unknown as {
  $transaction: Mock;
  user: {
    findUnique: Mock;
    create: Mock;
  };
  authSession: {
    create: Mock;
    findUnique: Mock;
    deleteMany: Mock;
  };
  loyaltyEvent: { upsert: Mock };
  creditLedgerEntry: { upsert: Mock };
};

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    clerkId: null,
    email: "buyer@ihobbyworld.local",
    displayName: "Buyer Account",
    handle: "buyer",
    passwordHash: "hash",
    role: UserRole.BUYER,
    status: UserStatus.ACTIVE,
    avatarUrl: null,
    sellerRatingAverage: null,
    sellerReviewCount: 0,
    sellerResponseMinutes: null,
    sellerResponseSampleCount: 0,
    createdAt: new Date("2026-07-01T00:00:00.000Z"),
    updatedAt: new Date("2026-07-01T00:00:00.000Z"),
    ...overrides
  };
}

describe("local credential auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback(prisma));
    prismaMock.authSession.create.mockResolvedValue({});
    prismaMock.loyaltyEvent.upsert.mockResolvedValue({});
    prismaMock.creditLedgerEntry.upsert.mockResolvedValue({});
  });

  it("signs in with a hashed password and stores a database session", async () => {
    const user = makeUser({
      id: "seller-1",
      email: "seller@ihobbyworld.local",
      displayName: "Seller Account",
      handle: "seller",
      passwordHash: await hashPassword("Seller@123"),
      role: UserRole.SELLER
    });
    prismaMock.user.findUnique.mockResolvedValue(user);

    const result = await signInWithPassword(" SELLER@IHOBBYWORLD.LOCAL ", "Seller@123");

    expect(result).toMatchObject({
      mode: "ok",
      actor: {
        id: "seller-1",
        email: "seller@ihobbyworld.local",
        role: "SELLER",
        authProvider: "local"
      }
    });
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { email: "seller@ihobbyworld.local" } });
    expect(prismaMock.authSession.create).toHaveBeenCalledWith({
      data: {
        userId: "seller-1",
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        expiresAt: expect.any(Date)
      }
    });
  });

  it("rejects invalid sign-in without creating a session", async () => {
    prismaMock.user.findUnique.mockResolvedValue(makeUser({
      passwordHash: await hashPassword("Buyer@123")
    }));

    const result = await signInWithPassword("buyer@ihobbyworld.local", "wrong-password");

    expect(result).toEqual({ mode: "invalid" });
    expect(prismaMock.authSession.create).not.toHaveBeenCalled();
  });

  it("registers buyers with hashed passwords and a signed-in session", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockImplementation(async ({ data }) => makeUser({
      email: data.email,
      displayName: data.displayName,
      handle: data.handle,
      passwordHash: data.passwordHash,
      role: data.role,
      status: data.status
    }));

    const result = await registerBuyerWithPassword({
      displayName: " New Buyer ",
      email: "NEWBUYER@IHOBBYWORLD.LOCAL",
      password: "NewBuyer@123"
    });

    expect(result).toMatchObject({
      mode: "ok",
      actor: {
        email: "newbuyer@ihobbyworld.local",
        displayName: "New Buyer",
        role: "BUYER",
        authProvider: "local"
      }
    });
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "newbuyer@ihobbyworld.local",
        displayName: "New Buyer",
        role: UserRole.BUYER,
        status: UserStatus.ACTIVE,
        passwordHash: expect.stringMatching(/^scrypt\$/)
      })
    });
    expect(prismaMock.authSession.create).toHaveBeenCalled();
    expect(prismaMock.loyaltyEvent.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ points: 100, reason: "Welcome reward" })
    }));
    expect(prismaMock.creditLedgerEntry.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ amount: 100, reason: "Welcome reward" })
    }));
  });

  it("resolves active sessions to local actors", async () => {
    prismaMock.authSession.findUnique.mockResolvedValue({
      id: "session-1",
      userId: "buyer-1",
      tokenHash: "hash",
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
      user: makeUser({ id: "buyer-1" })
    });

    const actor = await getActorFromLocalSession("raw-session-token");

    expect(actor).toMatchObject({
      id: "buyer-1",
      email: "buyer@ihobbyworld.local",
      role: "BUYER",
      authProvider: "local"
    });
    expect(prismaMock.authSession.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/) },
      include: { user: true }
    });
  });
});
