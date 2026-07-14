import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/health/database/route";
import { getDatabaseHealth } from "@/lib/server/database-health";

vi.mock("@/lib/server/database-health", () => ({
  getDatabaseHealth: vi.fn()
}));

describe("database health API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns healthy database status as JSON", async () => {
    vi.mocked(getDatabaseHealth).mockResolvedValue({
      connected: true,
      label: "DB live",
      listingCount: 9
    });

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      connected: true,
      label: "DB live",
      listingCount: 9
    });
  });

  it("returns service unavailable when the database is not connected", async () => {
    vi.mocked(getDatabaseHealth).mockResolvedValue({
      connected: false,
      label: "DB offline",
      listingCount: 0
    });

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      connected: false,
      label: "DB offline",
      listingCount: 0
    });
  });
});
