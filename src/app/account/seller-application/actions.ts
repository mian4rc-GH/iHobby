"use server";

import { redirect } from "next/navigation";
import { getCurrentActor } from "@/lib/auth";
import { createSellerApplication } from "@/lib/server/seller-applications";
import { normalizeSellerApplicationForm, sellerApplicationSchema } from "@/lib/validations/seller-application";

export async function submitSellerApplicationAction(formData: FormData) {
  const actor = await getCurrentActor();
  if (!actor.isAuthenticated) {
    redirect("/sign-in");
  }

  const parsed = sellerApplicationSchema.safeParse(normalizeSellerApplicationForm(formData));
  if (!parsed.success) {
    redirect("/account/seller-application?status=invalid");
  }

  let status: string;
  try {
    const result = await createSellerApplication(actor, parsed.data);
    status = result.mode;
  } catch {
    redirect("/account/seller-application?status=error");
  }

  redirect(`/account/seller-application?status=${status}`);
}
