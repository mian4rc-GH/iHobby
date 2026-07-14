import { beforeEach, describe, expect, it, vi } from "vitest";
import { approveSellerApplication, createSellerApplication, rejectSellerApplication } from "@/lib/server/seller-applications";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { createNotification } from "@/lib/server/notifications";
import { syncClerkRole } from "@/lib/server/users";
import type { Actor } from "@/types/domain";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    sellerApplication: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    auditLog: {
      create: vi.fn()
    },
    user: {
      update: vi.fn()
    }
  }
}));

vi.mock("@/lib/server/users", () => ({
  ensureUserForActor: vi.fn(async () => ({
    id: "demo-buyer",
    email: "buyer@ihobbyworld.local",
    displayName: "Eliot Manning",
    handle: "eliot",
    role: "BUYER"
  })),
  syncClerkRole: vi.fn()
}));

vi.mock("@/lib/server/notifications", () => ({
  createNotification: vi.fn()
}));

vi.mock("@/lib/email", () => ({
  sendEmail: vi.fn(),
  escapeHtml: (value: string) => value
}));

const demoBuyer: Actor = {
  id: "demo-buyer",
  email: "buyer@ihobbyworld.local",
  displayName: "Eliot Manning",
  handle: "eliot",
  role: "BUYER",
  avatarInitials: "EM",
  isAuthenticated: true,
  authProvider: "demo"
};

const input = {
  businessName: "Eliot's RC Bench",
  categoryFocus: "Drones, Cars, Components",
  experience: "I verify ownership, document condition clearly, and ship RC inventory with tracking."
};

describe("seller application persistence service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists local seller applications instead of bypassing the database", async () => {
    vi.mocked(prisma.sellerApplication.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.sellerApplication.create).mockResolvedValue({ id: "app-1" } as never);
    vi.mocked(prisma.auditLog.create).mockResolvedValue({ id: "audit-1" } as never);

    const result = await createSellerApplication(demoBuyer, input);

    expect(result).toEqual({ mode: "created", applicationId: "app-1" });
    expect(prisma.sellerApplication.create).toHaveBeenCalledWith({
      data: {
        applicantId: "demo-buyer",
        businessName: input.businessName,
        categoryFocus: input.categoryFocus,
        experience: input.experience
      }
    });
  });

  it("returns an existing pending application for local users", async () => {
    vi.mocked(prisma.sellerApplication.findFirst).mockResolvedValue({ id: "app-open" } as never);

    const result = await createSellerApplication(demoBuyer, input);

    expect(result).toEqual({ mode: "existing", applicationId: "app-open" });
    expect(prisma.sellerApplication.create).not.toHaveBeenCalled();
  });

  it("approves seller applications with role and audit writes in one transaction", async () => {
    const tx = {
      sellerApplication: {
        update: vi.fn().mockResolvedValue({
          id: "app-1",
          applicantId: "demo-buyer",
          applicant: { clerkId: "clerk-buyer", email: "buyer@ihobbyworld.local" }
        })
      },
      user: {
        update: vi.fn().mockResolvedValue({ id: "demo-buyer", role: "SELLER" })
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: "audit-1" })
      },
      loyaltyEvent: {
        upsert: vi.fn().mockResolvedValue({ id: "reward-1" })
      },
      creditLedgerEntry: {
        upsert: vi.fn().mockResolvedValue({ id: "credit-1" })
      }
    };
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(tx as never));

    const result = await approveSellerApplication(demoBuyer, "app-1", "approved");

    expect(result).toEqual({ mode: "approved", applicationId: "app-1" });
    expect(tx.sellerApplication.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "app-1" } }));
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "demo-buyer" },
      data: { role: "SELLER" }
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "seller_application.approved" })
    }));
    expect(tx.loyaltyEvent.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ points: 300, rewardKey: "SELLER_APPROVED:app-1" })
    }));
    expect(tx.creditLedgerEntry.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ amount: 150, rewardKey: "SELLER_APPROVED:app-1" })
    }));
    expect(syncClerkRole).toHaveBeenCalledWith("clerk-buyer", "SELLER");
    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: "demo-buyer",
      kind: "seller_approved",
      linkUrl: "/dashboard/seller"
    }));
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "buyer@ihobbyworld.local",
      subject: expect.stringContaining("approved")
    }));
  });

  it("rejects seller applications with applicant notifications", async () => {
    const tx = {
      sellerApplication: {
        update: vi.fn().mockResolvedValue({
          id: "app-1",
          applicantId: "demo-buyer",
          applicant: { email: "buyer@ihobbyworld.local" }
        })
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: "audit-1" })
      }
    };
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => callback(tx as never));

    const result = await rejectSellerApplication(demoBuyer, "app-1", "Need clearer proof of inventory.");

    expect(result).toEqual({ mode: "rejected", applicationId: "app-1" });
    expect(tx.sellerApplication.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "app-1" },
      include: { applicant: true }
    }));
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: "seller_application.rejected" })
    }));
    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: "demo-buyer",
      kind: "seller_rejected",
      linkUrl: "/account/seller-application"
    }));
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "buyer@ihobbyworld.local",
      text: expect.stringContaining("Need clearer proof of inventory.")
    }));
  });
});
