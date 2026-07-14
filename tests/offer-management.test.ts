import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  acceptOfferForActor,
  declineOfferForActor,
  withdrawOfferForActor
} from "@/lib/server/marketplace";
import { prisma } from "@/lib/prisma";
import { ensureUserForActor } from "@/lib/server/users";
import { createNotification } from "@/lib/server/notifications";
import { sendEmail } from "@/lib/email";
import type { Actor } from "@/types/domain";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    offer: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn()
    },
    listing: {
      update: vi.fn()
    },
    auditLog: {
      create: vi.fn()
    }
  }
}));

vi.mock("@/lib/server/users", () => ({
  ensureUserForActor: vi.fn()
}));

vi.mock("@/lib/server/notifications", () => ({
  createNotification: vi.fn()
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
  escapeHtml: (value: string) => value
}));

const sellerActor: Actor = {
  id: "seller-1",
  email: "seller@example.com",
  displayName: "Seller",
  handle: "seller",
  role: "SELLER",
  avatarInitials: "SE",
  isAuthenticated: true,
  authProvider: "demo"
};

const buyerActor: Actor = {
  id: "buyer-1",
  email: "buyer@example.com",
  displayName: "Buyer",
  handle: "buyer",
  role: "BUYER",
  avatarInitials: "BU",
  isAuthenticated: true,
  authProvider: "demo"
};

const pendingOffer = {
  id: "offer-1",
  listingId: "listing-1",
  buyerId: "buyer-1",
  amountCents: 42000,
  message: "Can pick up locally.",
  status: "PENDING",
  createdAt: new Date("2026-07-01T10:00:00.000Z"),
  buyer: {
    id: "buyer-1",
    email: "buyer@example.com",
    displayName: "Buyer"
  },
  listing: {
    id: "listing-1",
    slug: "test-vehicle",
    title: "Test vehicle",
    sellerId: "seller-1",
    status: "ACTIVE",
    seller: {
      email: "seller@example.com",
      displayName: "Seller"
    }
  }
};

describe("offer management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(prisma as never) as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({ id: "audit-1" } as never);
    vi.mocked(prisma.offer.update).mockResolvedValue({ id: "offer-1" } as never);
    vi.mocked(prisma.offer.updateMany).mockResolvedValue({ count: 1 } as never);
    vi.mocked(prisma.listing.update).mockResolvedValue({ id: "listing-1" } as never);
  });

  it("lets a listing seller accept a pending offer and closes competing offers", async () => {
    vi.mocked(ensureUserForActor).mockResolvedValue({ id: "seller-1", displayName: "Seller" } as never);
    vi.mocked(prisma.offer.findUnique).mockResolvedValue(pendingOffer as never);

    const result = await acceptOfferForActor(sellerActor, "offer-1");

    expect(result.mode).toBe("accepted");
    expect(prisma.offer.update).toHaveBeenCalledWith({
      where: { id: "offer-1" },
      data: { status: "ACCEPTED" }
    });
    expect(prisma.offer.updateMany).toHaveBeenCalledWith({
      where: {
        listingId: "listing-1",
        id: { not: "offer-1" },
        status: "PENDING"
      },
      data: { status: "DECLINED" }
    });
    expect(prisma.listing.update).toHaveBeenCalledWith({
      where: { id: "listing-1" },
      data: { status: "SOLD" }
    });
    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: "buyer-1",
      kind: "offer_accepted"
    }));
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "buyer@example.com"
    }));
  });

  it("lets a listing seller decline a pending offer", async () => {
    vi.mocked(ensureUserForActor).mockResolvedValue({ id: "seller-1", displayName: "Seller" } as never);
    vi.mocked(prisma.offer.findUnique).mockResolvedValue(pendingOffer as never);

    const result = await declineOfferForActor(sellerActor, "offer-1");

    expect(result.mode).toBe("declined");
    expect(prisma.offer.update).toHaveBeenCalledWith({
      where: { id: "offer-1" },
      data: { status: "DECLINED" }
    });
    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: "buyer-1",
      kind: "offer_declined"
    }));
  });

  it("lets a buyer withdraw their pending offer", async () => {
    vi.mocked(ensureUserForActor).mockResolvedValue({ id: "buyer-1", displayName: "Buyer" } as never);
    vi.mocked(prisma.offer.findUnique).mockResolvedValue(pendingOffer as never);

    const result = await withdrawOfferForActor(buyerActor, "offer-1");

    expect(result.mode).toBe("withdrawn");
    expect(prisma.offer.update).toHaveBeenCalledWith({
      where: { id: "offer-1" },
      data: { status: "WITHDRAWN" }
    });
    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: "seller-1",
      kind: "offer_withdrawn"
    }));
  });

  it("blocks a different seller from accepting someone else's offer", async () => {
    vi.mocked(ensureUserForActor).mockResolvedValue({ id: "other-seller", displayName: "Other Seller" } as never);
    vi.mocked(prisma.offer.findUnique).mockResolvedValue(pendingOffer as never);

    const result = await acceptOfferForActor(sellerActor, "offer-1");

    expect(result.mode).toBe("forbidden");
    expect(prisma.offer.update).not.toHaveBeenCalled();
    expect(prisma.listing.update).not.toHaveBeenCalled();
  });
});
