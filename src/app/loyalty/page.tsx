import { Award, Gift, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { AccessPanel } from "@/components/access-panel";
import { SiteShell } from "@/components/site-shell";
import { Badge, Card } from "@/components/ui";
import { getCurrentActor } from "@/lib/auth";
import { getLoyaltySummaryForActor } from "@/lib/server/marketplace";
import { rewardRules } from "@/lib/server/rewards";

export default async function LoyaltyPage() {
  const actor = await getCurrentActor();

  if (!actor.isAuthenticated) {
    return (
      <SiteShell>
        <AccessPanel title="Sign in to view rewards" />
      </SiteShell>
    );
  }

  const loyalty = await getLoyaltySummaryForActor(actor);

  return (
    <SiteShell>
      <div className="grid gap-5">
        <div>
          <Badge tone="good">Loyalty</Badge>
          <h1 className="mt-3 text-3xl font-bold">Rewards and trust points</h1>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">Rewards are recorded when approved account milestones are completed.</p>
        </div>

        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-[var(--ink-muted)]"><Award size={17} /> Current tier</div>
              <div className="mt-2 text-4xl font-bold">{loyalty.tier}</div>
              <div className="mt-2 text-sm text-[var(--ink-muted)]">
                {loyalty.nextTier ? `${loyalty.nextTier.points.toLocaleString()} points unlocks ${loyalty.nextTier.name}.` : "Highest loyalty tier reached."}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-[var(--ink-muted)]">Points</div>
              <div className="text-3xl font-bold">{loyalty.points.toLocaleString()}</div>
            </div>
          </div>
          <div className="mt-6 h-3 overflow-hidden rounded-full bg-[var(--background)]" aria-label="Loyalty tier progress">
            <div className="h-full rounded-full bg-[var(--teal)]" style={{ width: `${loyalty.progress}%` }} />
          </div>
        </Card>

        <section id="earning-rules" className="grid gap-4 md:grid-cols-3" aria-label="Reward rules">
          {rewardRules.map((rule, index) => (
            <Reward
              key={rule.type}
              icon={index === 0 ? <Gift size={18} /> : index === 1 ? <Award size={18} /> : <TrendingUp size={18} />}
              title={rule.title}
              body={`${rule.description} +${rule.points} points and +${rule.credits} credits.`}
            />
          ))}
        </section>

        <Card className="overflow-hidden">
          <div className="border-b border-[var(--line)] p-4">
            <h2 className="text-lg font-bold">Reward activity</h2>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {loyalty.activities.length ? loyalty.activities.map((activity) => (
              <div key={activity.id} className="grid gap-2 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <div className="font-bold">{activity.reason}</div>
                  <div className="mt-1 text-sm text-[var(--ink-muted)]">{activity.at}</div>
                </div>
                <div className="mono text-lg font-bold text-[var(--green)]">{activity.pointsLabel}</div>
              </div>
            )) : (
              <div className="p-4 text-sm text-[var(--ink-muted)]">No rewards have been earned by this account yet.</div>
            )}
          </div>
        </Card>

        <p className="text-sm text-[var(--ink-muted)]">Bids and offers do not earn rewards. A completed payment workflow is required before transaction rewards can be introduced.</p>
      </div>
    </SiteShell>
  );
}

function Reward({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <Card className="p-5">
      <div className="grid size-9 place-items-center rounded-md bg-[var(--surface-muted)] text-[var(--teal)]">{icon}</div>
      <h2 className="mt-4 font-bold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{body}</p>
    </Card>
  );
}
