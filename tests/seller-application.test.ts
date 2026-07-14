import { describe, expect, it } from "vitest";
import {
  normalizeSellerApplicationForm,
  sellerApplicationDecisionSchema,
  sellerApplicationSchema
} from "@/lib/validations/seller-application";

describe("seller application validation", () => {
  it("accepts complete applications", () => {
    const result = sellerApplicationSchema.safeParse({
      businessName: "Eliot's RC Bench",
      categoryFocus: "RC Vehicles and Photography",
      experience: "I verify ownership, include serial proof, describe condition clearly, and ship with tracking."
    });

    expect(result.success).toBe(true);
  });

  it("rejects thin seller experience", () => {
    const result = sellerApplicationSchema.safeParse({
      businessName: "Shop",
      categoryFocus: "RC",
      experience: "I sell stuff."
    });

    expect(result.success).toBe(false);
  });

  it("normalizes form data", () => {
    const form = new FormData();
    form.set("businessName", "Threadline Studio");
    form.set("categoryFocus", "Crafts");
    form.set("experience", "I maintain tools, verify ownership, describe condition, and ship safely.");

    expect(normalizeSellerApplicationForm(form).businessName).toBe("Threadline Studio");
  });

  it("requires an application id for decisions", () => {
    expect(sellerApplicationDecisionSchema.safeParse({ applicationId: "app-1" }).success).toBe(true);
    expect(sellerApplicationDecisionSchema.safeParse({ applicationId: "" }).success).toBe(false);
  });
});
