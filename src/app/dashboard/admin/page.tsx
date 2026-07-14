import { AlertTriangle, ClipboardCheck, ShieldCheck, Users } from "lucide-react";
import type { ReactNode } from "react";
import { AccessPanel } from "@/components/access-panel";
import { MetricGrid } from "@/components/metric-grid";
import { SiteShell } from "@/components/site-shell";
import { Badge, Card, LinkButton } from "@/components/ui";
import { getCurrentActor } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getDashboardMetricsForActor, listReportsForAdmin } from "@/lib/server/marketplace";

export default async function AdminDashboardPage() {
  const actor = await getCurrentActor();

  if (!can(actor.role, "admin:dashboard")) {
    return (
      <SiteShell>
        <AccessPanel title="Admin access required" />
      </SiteShell>
    );
  }

  const reports = await listReportsForAdmin();
  const metrics = await getDashboardMetricsForActor(actor);

  return (
    <SiteShell>
      <div className="grid gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge tone="bad">Admin workspace</Badge>
            <h1 className="mt-3 text-3xl font-bold">RC trust, safety, and operations</h1>
            <p className="mt-2 text-sm text-[var(--ink-muted)]">Signed in as {actor.displayName}</p>
          </div>
          <div className="flex gap-2">
            <LinkButton href="/admin/listings"><ClipboardCheck size={16} /> Moderation</LinkButton>
            <LinkButton href="/admin/users" variant="primary"><Users size={16} /> Users</LinkButton>
          </div>
        </div>

        <MetricGrid metrics={metrics} />

        <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <Card className="overflow-hidden">
            <div className="border-b border-[var(--line)] p-4">
              <h2 className="text-lg font-bold">Open reports</h2>
            </div>
            <div className="divide-y divide-[var(--line)]">
              {reports.map((report) => (
                <div key={report.id} className="grid gap-2 p-4 sm:grid-cols-[1fr_auto]">
                  <div>
                    <div className="font-semibold">{report.listingTitle}</div>
                    <div className="mt-1 text-sm text-[var(--ink-muted)]">{report.reason}</div>
                  </div>
                  <Badge tone={report.status === "OPEN" ? "warn" : "info"}>{report.status.toLowerCase()}</Badge>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="text-lg font-bold">Control checks</h2>
            <div className="mt-4 grid gap-3">
              <AdminCheck icon={<ShieldCheck size={17} />} title="Role claims" body="Clerk metadata maps to server-side RBAC." />
              <AdminCheck icon={<AlertTriangle size={17} />} title="Audit log" body="Admin and moderation actions are modeled for persistence." />
              <AdminCheck icon={<ClipboardCheck size={17} />} title="AI review" body="AI assistance remains advisory and auditable." />
            </div>
          </Card>
        </section>
      </div>
    </SiteShell>
  );
}

function AdminCheck({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="flex gap-3 rounded-md border border-[var(--line)] p-3">
      <div className="grid size-8 place-items-center rounded-md bg-[var(--surface-muted)] text-[var(--red)]">{icon}</div>
      <div>
        <div className="text-sm font-bold">{title}</div>
        <p className="mt-1 text-sm text-[var(--ink-muted)]">{body}</p>
      </div>
    </div>
  );
}
