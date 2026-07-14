"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentActor } from "@/lib/auth";
import { updateUserProfileAsAdmin, updateUserRoleAsAdmin, updateUserStatusAsAdmin } from "@/lib/server/marketplace";

const changeRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["BUYER", "SELLER", "ADMIN"])
});

const changeStatusSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(["ACTIVE", "SUSPENDED", "CLOSED"])
});

const updateProfileSchema = z.object({
  userId: z.string().uuid(),
  displayName: z.string().trim().min(2).max(80),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9][a-z0-9_-]*$/, "Handle must use lowercase letters, numbers, hyphens, or underscores."),
  email: z.string().trim().toLowerCase().email().max(120)
});

export async function changeUserRoleAction(formData: FormData) {
  const actor = await getCurrentActor();
  const parsed = changeRoleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/users?status=invalid");

  const result = await updateUserRoleAsAdmin(actor, parsed.data.userId, parsed.data.role);
  redirect(`/admin/users?status=${result.mode}`);
}

export async function changeUserStatusAction(formData: FormData) {
  const actor = await getCurrentActor();
  const parsed = changeStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/users?status=invalid");

  const result = await updateUserStatusAsAdmin(actor, parsed.data.userId, parsed.data.status);
  redirect(`/admin/users?status=${result.mode}`);
}

export async function updateUserProfileAction(formData: FormData) {
  const actor = await getCurrentActor();
  const parsed = updateProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/users?status=invalid");

  const { userId, ...input } = parsed.data;
  const result = await updateUserProfileAsAdmin(actor, userId, input);
  redirect(`/admin/users?status=${result.mode}`);
}
