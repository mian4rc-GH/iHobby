"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentActor } from "@/lib/auth";
import { setSellerListingStatusForActor, updateSellerListingForActor } from "@/lib/server/marketplace";

const listingIdSchema = z.string().uuid();

const updateSchema = z.object({
  listingId: listingIdSchema,
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().min(1).max(10_000),
  condition: z.string().trim().min(1).max(80),
  price: z.coerce.number().positive().max(1_000_000),
  location: z.string().trim().min(1).max(120)
});

const statusSchema = z.object({
  listingId: listingIdSchema,
  nextStatus: z.enum(["PAUSED", "ACTIVE", "ARCHIVED"])
});

export async function updateSellerListingAction(formData: FormData) {
  const actor = await getCurrentActor();
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/sell/listings?notice=invalid");

  const result = await updateSellerListingForActor(actor, parsed.data.listingId, {
    title: parsed.data.title,
    description: parsed.data.description,
    condition: parsed.data.condition,
    priceCents: Math.round(parsed.data.price * 100),
    location: parsed.data.location
  });

  redirect(`/sell/listings?notice=${result.mode}`);
}

export async function changeSellerListingStatusAction(formData: FormData) {
  const actor = await getCurrentActor();
  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/sell/listings?notice=invalid");

  const result = await setSellerListingStatusForActor(actor, parsed.data.listingId, parsed.data.nextStatus);
  redirect(`/sell/listings?notice=${result.mode}`);
}
