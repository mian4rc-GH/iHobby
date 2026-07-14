import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentActor } from "@/lib/auth";
import { getWalletLedgerExportForActor } from "@/lib/server/marketplace";
import { GET } from "@/app/api/wallet/export/route";

vi.mock("@/lib/auth", () => ({
  getCurrentActor: vi.fn()
}));

vi.mock("@/lib/server/marketplace", () => ({
  getWalletLedgerExportForActor: vi.fn()
}));

describe("wallet export route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the authenticated user's ledger as a private CSV attachment", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue({ isAuthenticated: true } as never);
    vi.mocked(getWalletLedgerExportForActor).mockResolvedValue([
      {
        id: "entry-1",
        amount: 100,
        kind: "CREDIT",
        status: "POSTED",
        reason: "Welcome reward",
        createdAt: new Date("2026-07-13T09:30:00.000Z")
      }
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");
    expect(response.headers.get("content-disposition")).toContain("attachment; filename=");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    await expect(response.text()).resolves.toContain('"Welcome reward"');
  });

  it("rejects export requests without an authenticated actor", async () => {
    vi.mocked(getCurrentActor).mockResolvedValue({ isAuthenticated: false } as never);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(getWalletLedgerExportForActor).not.toHaveBeenCalled();
  });
});
