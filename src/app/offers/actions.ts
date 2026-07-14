"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentActor } from "@/lib/auth";
import {
  acceptOfferForActor,
  declineOfferForActor,
  withdrawOfferForActor
} from "@/lib/server/marketplace";

const offerIdSchema = z.object({
  offerId: z.string().min(1)
});

export async function acceptOfferAction(formData: FormData) {
  const parsed = offerIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/offers?status=invalid");

  const actor = await getCurrentActor();
  const result = await acceptOfferForActor(actor, parsed.data.offerId);
  redirect(`/offers?status=${result.mode}`);
}

export async function declineOfferAction(formData: FormData) {
  const parsed = offerIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/offers?status=invalid");

  const actor = await getCurrentActor();
  const result = await declineOfferForActor(actor, parsed.data.offerId);
  redirect(`/offers?status=${result.mode}`);
}

export async function withdrawOfferAction(formData: FormData) {
  const parsed = offerIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/offers?status=invalid");

  const actor = await getCurrentActor();
  const result = await withdrawOfferForActor(actor, parsed.data.offerId);
  redirect(`/offers?status=${result.mode}`);
}
