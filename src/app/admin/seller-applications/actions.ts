"use server";

import { redirect } from "next/navigation";
import { getCurrentActor } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { approveSellerApplication, rejectSellerApplication } from "@/lib/server/seller-applications";
import { sellerApplicationDecisionSchema } from "@/lib/validations/seller-application";

export async function approveSellerApplicationAction(formData: FormData) {
  const actor = await getCurrentActor();
  if (!can(actor.role, "admin:manage-users")) redirect("/sign-in");

  const parsed = sellerApplicationDecisionSchema.safeParse({
    applicationId: String(formData.get("applicationId") ?? ""),
    notes: String(formData.get("notes") ?? "")
  });
  if (!parsed.success) redirect("/admin/seller-applications?status=invalid");

  let status: string;
  try {
    const result = await approveSellerApplication(actor, parsed.data.applicationId, parsed.data.notes);
    status = result.mode;
  } catch {
    redirect("/admin/seller-applications?status=error");
  }

  redirect(`/admin/seller-applications?status=${status}`);
}

export async function rejectSellerApplicationAction(formData: FormData) {
  const actor = await getCurrentActor();
  if (!can(actor.role, "admin:manage-users")) redirect("/sign-in");

  const parsed = sellerApplicationDecisionSchema.safeParse({
    applicationId: String(formData.get("applicationId") ?? ""),
    notes: String(formData.get("notes") ?? "")
  });
  if (!parsed.success) redirect("/admin/seller-applications?status=invalid");

  let status: string;
  try {
    const result = await rejectSellerApplication(actor, parsed.data.applicationId, parsed.data.notes);
    status = result.mode;
  } catch {
    redirect("/admin/seller-applications?status=error");
  }

  redirect(`/admin/seller-applications?status=${status}`);
}
