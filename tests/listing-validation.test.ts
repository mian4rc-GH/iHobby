import { afterEach, describe, expect, it } from "vitest";
import { categories, listings } from "@/lib/data";
import { listingCompletenessScore, normalizeListingDraftForm, validateListingDraft } from "@/lib/validations/listing";

describe("listing validation", () => {
  const category = categories[0];
  const listing = listings[0];
  const originalStoragePublicUrl = process.env.STORAGE_PUBLIC_URL;

  afterEach(() => {
    if (originalStoragePublicUrl === undefined) {
      delete process.env.STORAGE_PUBLIC_URL;
    } else {
      process.env.STORAGE_PUBLIC_URL = originalStoragePublicUrl;
    }
  });

  it("accepts a complete category-specific listing", () => {
    const result = validateListingDraft(
      {
        title: listing.title,
        description: listing.description,
        categorySlug: listing.categorySlug,
        condition: listing.condition,
        listingType: listing.listingType,
        priceCents: listing.priceCents,
        location: listing.location,
        attributes: listing.attributes
      },
      category
    );

    expect(result.success).toBe(true);
  });

  it("rejects missing required category attributes", () => {
    const result = validateListingDraft(
      {
        title: listing.title,
        description: listing.description,
        categorySlug: listing.categorySlug,
        condition: listing.condition,
        listingType: listing.listingType,
        priceCents: listing.priceCents,
        location: listing.location,
        attributes: {}
      },
      category
    );

    expect(result.success).toBe(false);
  });

  it("scores completeness higher for rich listings", () => {
    const score = listingCompletenessScore(
      {
        title: listing.title,
        description: listing.description,
        categorySlug: listing.categorySlug,
        condition: listing.condition,
        listingType: listing.listingType,
        priceCents: listing.priceCents,
        location: listing.location,
        attributes: listing.attributes,
        mediaUrls: []
      },
      category
    );

    expect(score).toBeGreaterThan(70);
  });

  it("normalizes RC listing form data into a typed draft", () => {
    const form = new FormData();
    form.set("scope", "vehicles");
    form.set("categorySlug", "drones");
    form.set("componentType", "all");
    form.set("title", "Autel EVO Lite+ - Fly More Kit");
    form.set("condition", "Like new");
    form.set("brand", "Autel");
    form.set("model", "EVO Lite+");
    form.set("year", "2024");
    form.set("runtime", "40 min");
    form.set("serialProof", "Serial photo attached");
    form.set("accessories", "Six batteries and case");
    form.set("description", listing.description);
    form.set("listingType", "AUCTION");
    form.set("startPrice", "642");
    form.set("reservePrice", "700");
    form.set("buyNow", "820");
    form.set("duration", "7");
    form.set("shipping", "insured-ground");
    form.set("location", "Austin, TX");
    form.append("mediaUrls", "/api/uploads/listing-123e4567-e89b-12d3-a456-426614174000.webp");
    process.env.STORAGE_PUBLIC_URL = "https://cdn.example.com/listings";
    form.append("mediaUrls", "https://cdn.example.com/listings/angle-2.webp");
    form.append("mediaUrls", "javascript:alert(1)");
    form.append("mediaUrls", "/uploads/listings/cover.webp");

    const draft = normalizeListingDraftForm(form);

    expect(draft.priceCents).toBe(64200);
    expect(draft.reserveCents).toBe(70000);
    expect(draft.buyNowCents).toBe(82000);
    expect(draft.mediaUrls).toEqual([
      "/api/uploads/listing-123e4567-e89b-12d3-a456-426614174000.webp",
      "https://cdn.example.com/listings/angle-2.webp"
    ]);
    expect(draft.attributes.vehicleType).toBe("drones");
    expect(draft.attributes.brand).toBe("Autel");
  });

  it("keeps at most 8 submitted media URLs in upload order", () => {
    const form = new FormData();
    for (let index = 1; index <= 10; index += 1) {
      form.append("mediaUrls", `/api/uploads/listing-${index}.webp`);
    }

    const draft = normalizeListingDraftForm(form);

    expect(draft.mediaUrls).toHaveLength(8);
    expect(draft.mediaUrls[0]).toBe("/api/uploads/listing-1.webp");
    expect(draft.mediaUrls.at(-1)).toBe("/api/uploads/listing-8.webp");
  });

  it("rejects remote media outside configured storage", () => {
    process.env.STORAGE_PUBLIC_URL = "https://cdn.example.com/listings";
    const form = new FormData();
    form.append("mediaUrls", "https://untrusted.example.com/photo.webp");
    form.append("mediaUrls", "https://cdn.example.com/other/photo.webp");
    form.append("mediaUrls", "https://cdn.example.com/listings/photo.webp");

    expect(normalizeListingDraftForm(form).mediaUrls).toEqual([
      "https://cdn.example.com/listings/photo.webp"
    ]);
  });
});
