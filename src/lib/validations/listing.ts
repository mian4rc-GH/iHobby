import { z } from "zod";
import type { Category } from "@/types/domain";

export const listingDraftSchema = z.object({
  title: z.string().trim().min(12, "Title must be at least 12 characters").max(120),
  description: z.string().trim().min(40, "Description must be at least 40 characters").max(4000),
  categorySlug: z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/),
  condition: z.string().trim().min(2).max(80),
  listingType: z.enum(["FIXED_PRICE", "AUCTION", "OFFER"]),
  priceCents: z.number().int().positive(),
  reserveCents: z.number().int().nonnegative().optional(),
  buyNowCents: z.number().int().positive().optional(),
  location: z.string().trim().min(2).max(120),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
  mediaUrls: z.array(z.string()).optional().default([])
});

export type ListingDraftInput = z.infer<typeof listingDraftSchema>;

export function normalizeListingDraftForm(formData: FormData): ListingDraftInput {
  const categorySlug = stringFormValue(formData, "categorySlug", "drones");
  const brand = stringFormValue(formData, "brand");
  const model = stringFormValue(formData, "model");
  const year = stringFormValue(formData, "year");
  const runtime = stringFormValue(formData, "runtime");
  const serialProof = stringFormValue(formData, "serialProof");
  const accessories = stringFormValue(formData, "accessories");
  const scope = stringFormValue(formData, "scope", "vehicles");
  const componentType = stringFormValue(formData, "componentType", "all");

  const mediaUrls = Array.from(
    new Set(
      formData
        .getAll("mediaUrls")
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(isListingMediaUrl)
    )
  ).slice(0, 8);

  return {
    title: stringFormValue(formData, "title"),
    description: stringFormValue(formData, "description"),
    categorySlug,
    condition: stringFormValue(formData, "condition"),
    listingType: listingTypeFormValue(formData),
    priceCents: moneyFormValue(formData, "startPrice"),
    reserveCents: optionalMoneyFormValue(formData, "reservePrice"),
    buyNowCents: optionalMoneyFormValue(formData, "buyNow"),
    location: stringFormValue(formData, "location"),
    mediaUrls,
    attributes: {
      scope,
      vehicleType: categorySlug,
      componentType,
      brand,
      model,
      year,
      runtime,
      serialProof,
      accessories,
      shipping: stringFormValue(formData, "shipping", "insured-ground"),
      durationDays: Number(stringFormValue(formData, "duration", "7"))
    }
  };
}

export function validateListingDraft(input: unknown, category?: Category) {
  const parsed = listingDraftSchema.safeParse(input);
  if (!parsed.success) return parsed;

  if (!category) return parsed;

  const missing = category.attributes.required.filter((key) => {
    const value = parsed.data.attributes[key];
    return value === undefined || value === "";
  });

  if (missing.length === 0) return parsed;

  return {
    success: false as const,
    error: new z.ZodError(
      missing.map((key) => ({
        code: "custom",
        path: ["attributes", key],
        message: `${key} is required for ${category.name}`
      }))
    )
  };
}

export function listingCompletenessScore(input: ListingDraftInput, category?: Category) {
  const required = category?.attributes.required ?? [];
  const optional = category?.attributes.optional ?? [];
  const presentRequired = required.filter((key) => Boolean(input.attributes[key])).length;
  const presentOptional = optional.filter((key) => Boolean(input.attributes[key])).length;
  const base = input.title.length >= 30 ? 20 : 10;
  const description = input.description.length >= 120 ? 25 : 12;
  const requiredScore = required.length ? Math.round((presentRequired / required.length) * 35) : 35;
  const optionalScore = optional.length ? Math.round((presentOptional / optional.length) * 20) : 20;
  return Math.min(100, base + description + requiredScore + optionalScore);
}

function stringFormValue(formData: FormData, key: string, fallback = "") {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() || fallback : fallback;
}

function listingTypeFormValue(formData: FormData): ListingDraftInput["listingType"] {
  const value = stringFormValue(formData, "listingType", "AUCTION");
  if (value === "FIXED_PRICE" || value === "AUCTION" || value === "OFFER") return value;
  return "AUCTION";
}

function moneyFormValue(formData: FormData, key: string) {
  return Math.max(1, Math.round(Number(stringFormValue(formData, key, "0").replace(/[$,]/g, "")) * 100));
}

function optionalMoneyFormValue(formData: FormData, key: string) {
  const value = stringFormValue(formData, key);
  if (!value) return undefined;
  const cents = Math.round(Number(value.replace(/[$,]/g, "")) * 100);
  return Number.isFinite(cents) && cents > 0 ? cents : undefined;
}

function isListingMediaUrl(value: string) {
  if (value.startsWith("/media/")) return true;
  if (value.startsWith("/api/uploads/")) {
    const key = value.slice("/api/uploads/".length);
    return /^listing-[0-9a-f-]+\.(?:jpe?g|png|webp)$/i.test(key);
  }

  try {
    const url = new URL(value);
    const storagePublicUrl = process.env.STORAGE_PUBLIC_URL;
    if (!storagePublicUrl) return false;

    const storageUrl = new URL(storagePublicUrl);
    const storagePath = storageUrl.pathname.replace(/\/$/, "");
    return url.origin === storageUrl.origin && url.pathname.startsWith(`${storagePath}/`);
  } catch {
    return false;
  }
}
