import { AccessPanel } from "@/components/access-panel";
import { SiteShell } from "@/components/site-shell";
import { Badge, Card } from "@/components/ui";
import { getCurrentActor } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listAdminAuditLogs } from "@/lib/server/marketplace";
import type { Role } from "@/types/domain";

export default async function AdminAuditPage() {
  const actor = await getCurrentActor();

  if (!can(actor.role, "admin:dashboard")) {
    return (
      <SiteShell>
        <AccessPanel title="Admin audit access required" />
      </SiteShell>
    );
  }

  const auditRows = await listAdminAuditLogs();

  return (
    <SiteShell>
      <div className="grid gap-5">
        <div>
          <Badge tone="bad">Audit</Badge>
          <h1 className="mt-3 text-3xl font-bold">Platform audit log</h1>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            Latest persisted admin and system events across listings, reports, users, and taxonomy.
          </p>
        </div>
        <Card className="overflow-hidden">
          {auditRows.length === 0 ? (
            <div className="p-8 text-center text-sm text-[var(--ink-muted)]">No audit events recorded yet.</div>
          ) : (
            auditRows.map((row) => (
              <div key={row.id} className="grid gap-3 border-b border-[var(--line)] p-4 last:border-b-0 lg:grid-cols-[1fr_auto_auto] lg:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold">{row.action}</span>
                    <Badge>{row.entity}</Badge>
                    {row.entityId ? <span className="font-mono text-xs text-[var(--ink-muted)]">{row.entityId.slice(0, 8)}</span> : null}
                  </div>
                  <div className="mt-1 text-sm text-[var(--ink-muted)]">
                    {row.metadataSummary}
                  </div>
                </div>
                <div className="text-sm">
                  <div className="font-semibold">{row.actorName}</div>
                  <div className="text-xs text-[var(--ink-muted)]">{row.actorEmail ?? "system"}</div>
                  <div className="mt-1"><ActorBadge role={row.actorRole} /></div>
                </div>
                <div className="text-sm text-[var(--ink-muted)]">{new Date(row.createdAt).toLocaleString()}</div>
              </div>
            ))
          )}
        </Card>
      </div>
    </SiteShell>
  );
}

function ActorBadge({ role }: { role: Role | "SYSTEM" }) {
  const tone: Record<Role | "SYSTEM", "bad" | "accent" | "info" | "neutral"> = {
    ADMIN: "bad",
    SELLER: "accent",
    BUYER: "info",
    VISITOR: "neutral",
    SYSTEM: "neutral"
  };
  return <Badge tone={tone[role]}>{role.toLowerCase()}</Badge>;
}
