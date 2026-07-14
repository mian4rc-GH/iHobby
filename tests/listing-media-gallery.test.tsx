import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ListingMediaGallery } from "@/components/listing-media-gallery";

describe("ListingMediaGallery", () => {
  it("renders every product image thumbnail", () => {
    render(
      <ListingMediaGallery
        title="Test vehicle"
        media={Array.from({ length: 7 }, (_, index) => ({
          url: `/uploads/listings/angle-${index + 1}.svg`,
          alt: `Angle ${index + 1}`
        }))}
      />
    );

    expect(screen.getAllByRole("button", { name: /^Show Angle/ })).toHaveLength(7);
  });

  it("switches the primary image when a thumbnail is clicked", () => {
    render(
      <ListingMediaGallery
        title="Test vehicle"
        media={[
          { url: "/uploads/listings/cover.svg", alt: "Cover angle" },
          { url: "/uploads/listings/side.svg", alt: "Side angle" }
        ]}
      />
    );

    const coverButton = screen.getByRole("button", { name: "Show Cover angle" });
    const sideButton = screen.getByRole("button", { name: "Show Side angle" });

    expect(coverButton.getAttribute("aria-pressed")).toBe("true");
    expect(sideButton.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(sideButton);

    expect(coverButton.getAttribute("aria-pressed")).toBe("false");
    expect(sideButton.getAttribute("aria-pressed")).toBe("true");
    expect(within(screen.getByTestId("listing-primary-media")).getByRole("img").getAttribute("alt")).toBe("Side angle");
  });
});
