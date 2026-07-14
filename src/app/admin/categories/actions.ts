"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentActor } from "@/lib/auth";
import { createCategoryAsAdmin, updateCategoryAsAdmin } from "@/lib/server/marketplace";

const createSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  description: z.string().max(500).optional().default("")
});

const updateSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(500).optional()
});

const toggleSchema = z.object({
  categoryId: z.string().uuid(),
  active: z.enum(["true", "false"])
});

export async function createCategoryAction(formData: FormData) {
  const actor = await getCurrentActor();
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/categories?status=invalid");

  const result = await createCategoryAsAdmin(actor, parsed.data);
  if (result.mode === "conflict") redirect("/admin/categories?status=conflict");
  redirect(`/admin/categories?status=${result.mode}`);
}

export async function updateCategoryAction(formData: FormData) {
  const actor = await getCurrentActor();
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/categories?status=invalid");

  const { categoryId, ...input } = parsed.data;
  const result = await updateCategoryAsAdmin(actor, categoryId, input);
  redirect(`/admin/categories?status=${result.mode}`);
}

export async function toggleCategoryAction(formData: FormData) {
  const actor = await getCurrentActor();
  const parsed = toggleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/categories?status=invalid");

  const result = await updateCategoryAsAdmin(actor, parsed.data.categoryId, {
    active: parsed.data.active === "true"
  });
  redirect(`/admin/categories?status=${result.mode}`);
}
