import type { WalletLedgerExportRow } from "@/lib/server/marketplace";

export function buildWalletLedgerCsv(rows: WalletLedgerExportRow[]) {
  const header = ["entry_id", "created_at", "amount_credits", "kind", "status", "reason"];
  const values = rows.map((row) => [
    row.id,
    row.createdAt.toISOString(),
    String(row.amount),
    row.kind,
    row.status,
    row.reason
  ]);

  return [header, ...values].map((row) => row.map(escapeCsvValue).join(",")).join("\r\n");
}

function escapeCsvValue(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}
