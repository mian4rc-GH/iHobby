import { afterEach, describe, expect, it } from "vitest";
import { generateStorageKey, getPublicUrl, normalizeStoredMediaUrl } from "@/lib/storage";

const storageEnvKeys = [
  "STORAGE_ENDPOINT",
  "STORAGE_ACCESS_KEY_ID",
  "STORAGE_SECRET_ACCESS_KEY",
  "STORAGE_BUCKET",
  "STORAGE_PUBLIC_URL"
] as const;

const originalEnv = Object.fromEntries(
  storageEnvKeys.map((key) => [key, process.env[key]])
) as Record<(typeof storageEnvKeys)[number], string | undefined>;

describe("storage provider helpers", () => {
  afterEach(() => {
    for (const key of storageEnvKeys) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
  });

  it("falls back to local upload URLs when object storage is not configured", () => {
    for (const key of storageEnvKeys) delete process.env[key];

    expect(getPublicUrl("listing-1.webp")).toBe("/api/uploads/listing-1.webp");
  });

  it("builds public object storage URLs when S3-compatible storage is configured", () => {
    process.env.STORAGE_ENDPOINT = "https://r2.example.com";
    process.env.STORAGE_ACCESS_KEY_ID = "access";
    process.env.STORAGE_SECRET_ACCESS_KEY = "secret";
    process.env.STORAGE_BUCKET = "ihobbyworld";
    process.env.STORAGE_PUBLIC_URL = "https://cdn.example.com/ihobbyworld";

    expect(getPublicUrl("listing-1.webp")).toBe("https://cdn.example.com/ihobbyworld/listing-1.webp");
  });

  it("normalizes unsupported upload extensions to jpg", () => {
    expect(generateStorageKey("firmware.bin")).toMatch(/^listing-[0-9a-f-]+\.jpg$/);
    expect(generateStorageKey("untrusted.svg")).toMatch(/^listing-[0-9a-f-]+\.jpg$/);
  });

  it("converts legacy local listing-media URLs to the upload endpoint", () => {
    expect(normalizeStoredMediaUrl("/uploads/listings/listing-123e4567-e89b-12d3-a456-426614174000.png"))
      .toBe("/api/uploads/listing-123e4567-e89b-12d3-a456-426614174000.png");
    expect(normalizeStoredMediaUrl("/uploads/listings/not-an-upload.svg")).toBe("/uploads/listings/not-an-upload.svg");
  });
});
