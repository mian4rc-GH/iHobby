"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentActor } from "@/lib/auth";
import {
  createOfferForListing,
  createSellerReviewForActor,
  placeBidForListing,
  sendListingMessage,
  watchListingForActor
} from "@/lib/server/marketplace";

const listingActionSchema = z.object({
  listingId: z.string().min(1),
  slug: z.string().min(1)
});

const bidActionSchema = listingActionSchema.extend({
  amount: z.string().min(1)
});

const offerActionSchema = listingActionSchema.extend({
  amount: z.string().min(1),
  message: z.string().max(600).optional()
});

const messageActionSchema = listingActionSchema.extend({
  message: z.string().min(2).max(1000)
});

const reviewActionSchema = listingActionSchema.extend({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(500).optional()
});

export async function placeBidAction(formData: FormData) {
  const parsed = bidActionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/?status=invalid-bid");

  const actor = await getCurrentActor();
  const result = await placeBidForListing(actor, parsed.data.listingId, moneyToCents(parsed.data.amount));
  redirect(`/listings/${parsed.data.slug}?status=${listingStatusFor("bid", result.mode)}`);
}

export async function makeOfferAction(formData: FormData) {
  const parsed = offerActionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/?status=invalid-offer");

  const actor = await getCurrentActor();
  const result = await createOfferForListing(
    actor,
    parsed.data.listingId,
    moneyToCents(parsed.data.amount),
    parsed.data.message
  );
  redirect(`/listings/${parsed.data.slug}?status=${listingStatusFor("offer", result.mode)}`);
}

export async function watchListingAction(formData: FormData) {
  const parsed = listingActionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/?status=invalid-watch");

  const actor = await getCurrentActor();
  const result = await watchListingForActor(actor, parsed.data.listingId);
  redirect(`/listings/${parsed.data.slug}?status=${listingStatusFor("watch", result.mode)}`);
}

export async function messageSellerAction(formData: FormData) {
  const parsed = messageActionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/?status=invalid-message");

  const actor = await getCurrentActor();
  const result = await sendListingMessage(actor, parsed.data.listingId, parsed.data.message);
  redirect(`/listings/${parsed.data.slug}?status=${listingStatusFor("message", result.mode)}`);
}

export async function submitSellerReviewAction(formData: FormData) {
  const parsed = reviewActionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/?status=invalid-review");

  const actor = await getCurrentActor();
  const result = await createSellerReviewForActor(actor, {
    listingId: parsed.data.listingId,
    rating: parsed.data.rating,
    comment: parsed.data.comment
  });
  redirect(`/listings/${parsed.data.slug}?status=review-${result.mode}`);
}

function moneyToCents(value: string) {
  const cents = Math.round(Number(value.replace(/[$,]/g, "")) * 100);
  return Number.isFinite(cents) ? cents : 0;
}

function listingStatusFor(action: "bid" | "offer" | "watch" | "message", mode: string) {
  if (mode === "created") return `${action}-created`;
  return mode;
}
