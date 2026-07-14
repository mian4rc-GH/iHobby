"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentActor } from "@/lib/auth";
import { saveBuildWorkshopForActor } from "@/lib/server/marketplace";

const buildSchema = z.object({
  title: z.string().trim().min(1).max(120),
  vehicleType: z.string().trim().min(1).max(80),
  dryWeightGrams: z.coerce.number().int().min(0).max(100_000),
  estimatedCost: z.coerce.number().min(0).max(1_000_000),
  thrustRatio: z.string().trim().min(1).max(40),
  note: z.string().trim().max(1_000).optional(),
  parts: z.string().max(3_000)
});

export async function saveBuildWorkshopAction(formData: FormData) {
  const actor = await getCurrentActor();
  const parsed = buildSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/tools/build?status=invalid");

  const result = await saveBuildWorkshopForActor(actor, {
    ...parsed.data,
    estimatedCostCents: Math.round(parsed.data.estimatedCost * 100)
  });

  redirect(`/tools/build?status=${result.mode}`);
}
