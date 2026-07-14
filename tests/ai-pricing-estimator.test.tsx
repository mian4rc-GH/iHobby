import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AiPricingEstimator } from "@/components/ai-pricing-estimator";

describe("AiPricingEstimator", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("submits listing details and refreshes the displayed pricing guidance", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        provider: "groq",
        text: "Recommended range: $100-$120.",
        comparableSales: [{ id: "sale-1", title: "Comparable motor set", condition: "Excellent", soldPriceCents: 11500 }],
        guidance: { conservativeCents: 10000, recommendedCents: 11000, buyNowCents: 12000 },
        note: "Updated from one comparable sale."
      })
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <AiPricingEstimator
        pricing={{
          vehicleTypes: [{ id: "drones", name: "Drones", count: 4 }],
          selectedVehicleFamily: "drones",
          listingTitle: "T-Motor motor set",
          listingCondition: "Excellent",
          currentPriceCents: 11800,
          includedBatteries: 0,
          comparableSales: [],
          guidance: { conservativeCents: 9000, recommendedCents: 10000, buyNowCents: 11000 },
          note: "Initial guidance."
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Recalculate with AI" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ai/pricing",
      expect.objectContaining({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "T-Motor motor set",
          category: "drones",
          condition: "Excellent",
          targetPriceCents: 11800,
          attributes: {}
        })
      })
    );
    expect(await screen.findByText("Recommended range: $100-$120.")).toBeTruthy();
    expect(screen.getByText("Comparable motor set")).toBeTruthy();
    expect(screen.getByText("Updated from one comparable sale.")).toBeTruthy();
    expect(screen.getByText(/AI estimate.*groq/)).toBeTruthy();
  });
});
