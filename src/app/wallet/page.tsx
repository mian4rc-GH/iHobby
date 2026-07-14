import { Award, Download, Gavel, Tag } from "lucide-react";
import type { ReactNode } from "react";
import { AccessPanel } from "@/components/access-panel";
import { SiteShell } from "@/components/site-shell";
import { Badge, Card, LinkButton } from "@/components/ui";
import { getCurrentActor } from "@/lib/auth";
import { getWalletSummaryForActor } from "@/lib/server/marketplace";

export default async function WalletPage() {
  const actor = await getCurrentActor();

  if (!actor.isAuthenticated) {
    return (
      <SiteShell>
        <AccessPanel title="Sign in to view credits" />
      </SiteShell>
    );
  }

  const wallet = await getWalletSummaryForActor(actor);

  return (
    <SiteShell>
      <div className="page-head">
        <div>
          <Badge tone="accent">{wallet.title}</Badge>
          <h1 className="page-title mt-3">{wallet.title}</h1>
          <div className="page-sub">Credits for bids, boosts, verification, rewards, and seller payout tracking.</div>
        </div>
        <div className="page-actions">
          <LinkButton href="/loyalty#earning-rules">
            <Award size={16} /> Earn credits
          </LinkButton>
          <LinkButton href="/api/wallet/export" variant="primary">
            <Download size={16} /> Export ledger
          </LinkButton>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <section className="wallet-hero">
          <div className="relative">
            <div className="section-title mono upper text-[var(--ink-4)]">Available balance</div>
            <div className="wallet-balance mono">
              {formatCredits(wallet.balanceCredits)}
              <small>cr</small>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <WalletStat icon={<Gavel size={17} />} label="Bid holds" value={`${formatCredits(wallet.bidHoldsCredits)} cr`} />
              <WalletStat icon={<Tag size={17} />} label="Boost budget" value={`${formatCredits(wallet.boostBudgetCredits)} cr`} />
              <WalletStat icon={<Award size={17} />} label="Reward tier" value={wallet.rewardTier} />
            </div>
          </div>
        </section>

        <Card className="p-5">
          <h2 className="text-lg font-bold">Account rules</h2>
          <div className="mt-4 grid gap-3 text-sm text-[var(--ink-muted)]">
            <span>New buyers can bid after email verification.</span>
            <span>Seller payouts require approved seller status.</span>
            <span>Admin adjustments are recorded in the audit log.</span>
          </div>
        </Card>
      </div>

      <Card className="mt-4 overflow-hidden">
        <div className="border-b border-[var(--line)] p-4">
          <h2 className="text-lg font-bold">Ledger</h2>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {wallet.transactions.length ? (
            wallet.transactions.map((item) => (
              <div key={item.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                <div>
                  <div className="font-bold">{item.label}</div>
                  <div className="mt-1 text-sm text-[var(--ink-muted)]">{item.at}</div>
                </div>
                <Badge tone={item.tone}>{item.statusLabel}</Badge>
                <div className="mono text-lg font-bold">{item.amountLabel}</div>
              </div>
            ))
          ) : (
            <div className="p-4 text-sm text-[var(--ink-muted)]">No credit ledger entries have been recorded for this account.</div>
          )}
        </div>
      </Card>
    </SiteShell>
  );
}

function formatCredits(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function WalletStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/15 bg-white/10 p-4">
      <div className="flex items-center gap-2 text-sm text-[var(--bg-3)]">
        {icon} {label}
      </div>
      <div className="mt-2 font-bold">{value}</div>
    </div>
  );
}
