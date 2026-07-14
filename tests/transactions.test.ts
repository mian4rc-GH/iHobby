import { describe, expect, it } from "vitest";
import { listings } from "@/lib/data";
import { canMakeOffer, canPlaceBid, minimumNextBid } from "@/lib/transactions";

describe("marketplace transaction rules", () => {
  const auction = listings.find((listing) => listing.listingType === "AUCTION")!;
  const fixedPrice = listings.find((listing) => listing.listingType === "FIXED_PRICE")!;
  const testNow = new Date("2026-06-09T12:00:00.000Z");

  it("requires the correct auction increment", () => {
    expect(minimumNextBid(64000)).toBe(66500);
    const nextBid = minimumNextBid(auction.priceCents);
    expect(canPlaceBid(auction, "buyer-1", nextBid - 1, testNow).ok).toBe(false);
    expect(canPlaceBid(auction, "buyer-1", nextBid, testNow).ok).toBe(true);
  });

  it("prevents sellers from bidding or offering on their own listing", () => {
    expect(canPlaceBid(auction, auction.seller.id, minimumNextBid(auction.priceCents), testNow).ok).toBe(false);
    expect(canMakeOffer(fixedPrice, fixedPrice.seller.id, 10000).ok).toBe(false);
  });

  it("blocks bids on non-auction listings", () => {
    expect(canPlaceBid(fixedPrice, "buyer-1", 150000).ok).toBe(false);
  });

  it("keeps fallback demo auctions open relative to the current date", () => {
    expect(new Date(auction.endsAt ?? 0).getTime()).toBeGreaterThan(Date.now());
  });
});
