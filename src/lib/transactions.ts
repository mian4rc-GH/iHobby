import type { Listing } from "@/types/domain";

export interface BidDecision {
  ok: boolean;
  reason?: string;
  minimumCents: number;
}

export function minimumNextBid(currentPriceCents: number) {
  if (currentPriceCents < 10000) return currentPriceCents + 500;
  if (currentPriceCents < 100000) return currentPriceCents + 2500;
  return currentPriceCents + 5000;
}

export function canPlaceBid(listing: Listing, bidderId: string, amountCents: number, now = new Date()): BidDecision {
  const minimumCents = minimumNextBid(listing.priceCents);

  if (listing.status !== "ACTIVE") {
    return { ok: false, reason: "Listing is not active", minimumCents };
  }
  if (listing.listingType !== "AUCTION") {
    return { ok: false, reason: "Listing does not accept bids", minimumCents };
  }
  if (listing.seller.id === bidderId) {
    return { ok: false, reason: "Seller cannot bid on their own listing", minimumCents };
  }
  if (listing.endsAt && new Date(listing.endsAt).getTime() <= now.getTime()) {
    return { ok: false, reason: "Auction has ended", minimumCents };
  }
  if (amountCents < minimumCents) {
    return { ok: false, reason: "Bid is below the minimum increment", minimumCents };
  }

  return { ok: true, minimumCents };
}

export function canMakeOffer(listing: Listing, buyerId: string, amountCents: number) {
  if (listing.status !== "ACTIVE") return { ok: false, reason: "Listing is not active" };
  if (listing.seller.id === buyerId) return { ok: false, reason: "Seller cannot make an offer on their own listing" };
  if (listing.listingType === "AUCTION" && listing.buyNowCents && amountCents < listing.buyNowCents * 0.75) {
    return { ok: false, reason: "Offer is too far below the buy-now benchmark" };
  }
  if (amountCents <= 0) return { ok: false, reason: "Offer must be greater than zero" };
  return { ok: true };
}
