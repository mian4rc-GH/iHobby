import { describe, expect, it } from "vitest";
import { buildWalletLedgerCsv } from "@/lib/server/wallet-export";

describe("wallet ledger export", () => {
  it("creates a CSV with a stable header and escaped user-visible values", () => {
    const csv = buildWalletLedgerCsv([
      {
        id: "entry-1",
        amount: 75,
        kind: "CREDIT",
        status: "POSTED",
        reason: "Listing approved, \"verified\"",
        createdAt: new Date("2026-07-13T09:30:00.000Z")
      }
    ]);

    expect(csv).toBe([
      '"entry_id","created_at","amount_credits","kind","status","reason"',
      '"entry-1","2026-07-13T09:30:00.000Z","75","CREDIT","POSTED","Listing approved, ""verified"""'
    ].join("\r\n"));
  });
});
