import { NextResponse } from "next/server";
import { getCurrentActor } from "@/lib/auth";
import { getWalletLedgerExportForActor } from "@/lib/server/marketplace";
import { buildWalletLedgerCsv } from "@/lib/server/wallet-export";

export async function GET() {
  const actor = await getCurrentActor();
  if (!actor.isAuthenticated) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const rows = await getWalletLedgerExportForActor(actor);
  if (!rows) {
    return NextResponse.json({ error: "Wallet export is temporarily unavailable." }, { status: 503 });
  }

  const filename = `ihobbyworld-wallet-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(buildWalletLedgerCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
