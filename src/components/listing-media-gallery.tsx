"use client";

import Image from "next/image";
import { useState } from "react";
import type { ListingMedia } from "@/types/domain";

export function ListingMediaGallery({
  media,
  title
}: {
  media: ListingMedia[];
  title: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const visibleMedia = media.length ? media : [{ url: "/media/drone-marketplace.svg", alt: title }];
  const selectedMedia = visibleMedia[selectedIndex] ?? visibleMedia[0];

  return (
    <>
      <div className="detail-img" data-testid="listing-primary-media">
        <Image
          key={selectedMedia.url}
          src={selectedMedia.url}
          alt={selectedMedia.alt || title}
          fill
          className="object-cover"
          priority
        />
      </div>
      <div className="detail-thumbs" aria-label="Listing media">
        {visibleMedia.map((item, index) => {
          const alt = item.alt || `${title} detail ${index + 1}`;
          const active = index === selectedIndex;

          return (
            <button
              key={`${item.url}-${index}`}
              type="button"
              className={active ? "detail-thumb active focus-ring p-0" : "detail-thumb focus-ring p-0"}
              aria-label={`Show ${alt}`}
              aria-pressed={active}
              onClick={() => setSelectedIndex(index)}
            >
              <Image
                src={item.url}
                alt={alt}
                fill
                className="object-cover"
              />
            </button>
          );
        })}
      </div>
    </>
  );
}
