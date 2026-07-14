"use server";

import { redirect } from "next/navigation";
import { getCurrentActor } from "@/lib/auth";
import { createListingFromDraft } from "@/lib/server/marketplace";
import { normalizeListingDraftForm } from "@/lib/validations/listing";

export async function createListingAction(formData: FormData) {
  const actor = await getCurrentActor();
  const draft = normalizeListingDraftForm(formData);
  const result = await createListingFromDraft(actor, draft);

  if (result.mode === "created") {
    redirect(`/listings/${result.slug}?status=created`);
  }

  redirect(`/sell/new?status=${result.mode}`);
}
