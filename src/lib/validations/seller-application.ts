import { z } from "zod";

export const sellerApplicationSchema = z.object({
  businessName: z.string().trim().min(3).max(120),
  categoryFocus: z.string().trim().min(3).max(240),
  experience: z.string().trim().min(40).max(3000)
});

export type SellerApplicationInput = z.infer<typeof sellerApplicationSchema>;

export const sellerApplicationDecisionSchema = z.object({
  applicationId: z.string().min(1),
  notes: z.string().trim().max(1000).optional()
});

export function normalizeSellerApplicationForm(formData: FormData): SellerApplicationInput {
  return {
    businessName: String(formData.get("businessName") ?? ""),
    categoryFocus: String(formData.get("categoryFocus") ?? ""),
    experience: String(formData.get("experience") ?? "")
  };
}
