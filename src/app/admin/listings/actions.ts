"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentActor } from "@/lib/auth";
import { approveListingAsAdmin, rejectListingAsAdmin, resolveReportAsAdmin } from "@/lib/server/marketplace";

const listingIdSchema = z.object({ listingId: z.string().uuid() });
const rejectSchema = z.object({ listingId: z.string().uuid(), reason: z.string().min(1).max(500) });
const reportSchema = z.object({
  reportId: z.string().uuid(),
  resolution: z.enum(["RESOLVED", "DISMISSED"]),
  returnTo: z.enum(["listings", "reports", "moderation-reports"]).optional().default("listings")
});

export async function approveListingAction(formData: FormData) {
  const actor = await getCurrentActor();
  const parsed = listingIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/listings?status=invalid");

  const result = await approveListingAsAdmin(actor, parsed.data.listingId);
  redirect(`/admin/listings?status=${result.mode}`);
}

export async function rejectListingAction(formData: FormData) {
  const actor = await getCurrentActor();
  const parsed = rejectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/listings?status=invalid");

  const result = await rejectListingAsAdmin(actor, parsed.data.listingId, parsed.data.reason);
  redirect(`/admin/listings?status=${result.mode}`);
}

export async function resolveReportAction(formData: FormData) {
  const actor = await getCurrentActor();
  const parsed = reportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/listings?status=invalid");

  const result = await resolveReportAsAdmin(actor, parsed.data.reportId, parsed.data.resolution);
  const returnPath = parsed.data.returnTo === "reports"
    ? "/admin/reports"
    : parsed.data.returnTo === "moderation-reports"
      ? "/admin/listings?tab=reports"
      : "/admin/listings";
  redirect(`${returnPath}${returnPath.includes("?") ? "&" : "?"}status=${result.mode}`);
}
