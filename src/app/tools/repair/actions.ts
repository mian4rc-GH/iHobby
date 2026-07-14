"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentActor } from "@/lib/auth";
import { createRepairSessionForActor } from "@/lib/server/marketplace";

const repairSchema = z.object({
  title: z.string().trim().min(1).max(100),
  vehicleType: z.string().trim().min(1).max(80),
  issueNotes: z.string().trim().min(10).max(2_000)
});

export async function createRepairDiagnosisAction(formData: FormData) {
  const actor = await getCurrentActor();
  const parsed = repairSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/tools/repair?new=1&status=invalid");

  const result = await createRepairSessionForActor(actor, parsed.data);
  if (result.mode === "created") redirect(`/tools/repair?session=${result.sessionId}&status=created`);
  redirect(`/tools/repair?new=1&status=${result.mode}`);
}
