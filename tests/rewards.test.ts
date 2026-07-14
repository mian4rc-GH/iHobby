import { describe, expect, it, vi } from "vitest";
import { buildLoyaltySummaryFromEvents } from "@/lib/server/marketplace";
import { awardReward } from "@/lib/server/rewards";

describe("rewards", () => {
  it("writes matching idempotent loyalty and wallet reward records", async () => {
    const tx = {
      loyaltyEvent: { upsert: vi.fn().mockResolvedValue({ id: "loyalty-1" }) },
      creditLedgerEntry: { upsert: vi.fn().mockResolvedValue({ id: "credit-1" }) }
    };

    await awardReward(tx as never, {
      userId: "seller-1",
      type: "LISTING_APPROVED",
      sourceId: "listing-1",
      metadata: { listingId: "listing-1" }
    });

    expect(tx.loyaltyEvent.upsert).toHaveBeenCalledWith({
      where: { rewardKey: "LISTING_APPROVED:listing-1" },
      update: {},
      create: expect.objectContaining({
        userId: "seller-1",
        points: 150,
        reason: "Listing approved",
        rewardKey: "LISTING_APPROVED:listing-1"
      })
    });
    expect(tx.creditLedgerEntry.upsert).toHaveBeenCalledWith({
      where: { rewardKey: "LISTING_APPROVED:listing-1" },
      update: {},
      create: expect.objectContaining({
        userId: "seller-1",
        amount: 75,
        reason: "Listing approved",
        rewardKey: "LISTING_APPROVED:listing-1"
      })
    });
  });

  it("calculates loyalty tiers and progress from persisted point events", () => {
    const summary = buildLoyaltySummaryFromEvents(
      650,
      [{ id: "reward-1", points: 150, reason: "Listing approved", createdAt: new Date("2026-07-13T09:00:00.000Z") }],
      new Date("2026-07-13T12:00:00.000Z")
    );

    expect(summary).toMatchObject({
      points: 650,
      tier: "Builder",
      nextTier: { name: "Verified", points: 1500 },
      progress: 15
    });
    expect(summary.activities).toEqual([expect.objectContaining({ pointsLabel: "+150 pts" })]);
  });
});
