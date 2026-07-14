import { CheckCircle2, ExternalLink, XCircle } from "lucide-react";
import { resolveReportAction } from "@/app/admin/listings/actions";
import { AccessPanel } from "@/components/access-panel";
import { SiteShell } from "@/components/site-shell";
import { Badge, Button, Card, LinkButton } from "@/components/ui";
import { getCurrentActor } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listAdminListings, listReportsForAdmin } from "@/lib/server/marketplace";

export default async function AdminReportsPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const actor = await getCurrentActor();
  const { status } = await searchParams;

  if (!can(actor.role, "admin:moderate")) {
    return (
      <SiteShell>
        <AccessPanel title="Admin report access required" />
      </SiteShell>
    );
  }

  const [reports, listings] = await Promise.all([listReportsForAdmin(), listAdminListings()]);
  const openCount = reports.filter((r) => r.status === "OPEN" || r.status === "REVIEWING").length;

  return (
    <SiteShell>
      <div className="grid gap-5">
        <div>
          <Badge tone="bad">Reports</Badge>
          <h1 className="mt-3 text-3xl font-bold">Trust reports</h1>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            {reports.length} total reports · {openCount} unresolved
          </p>
        </div>

        {status ? <StatusMessage status={status} /> : null}

        <Card className="overflow-hidden">
          {reports.length === 0 ? (
            <div className="p-8 text-center text-sm text-[var(--ink-muted)]">No reports on file.</div>
          ) : (
            <div className="divide-y divide-[var(--line)]">
              {reports.map((report) => {
                const listing = listings.find((l) => l.id === report.listingId);
                return (
                  <div key={report.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-bold">{report.listingTitle}</h2>
                        <Badge tone={report.status === "OPEN" || report.status === "REVIEWING" ? "warn" : report.status === "RESOLVED" ? "good" : "neutral"}>
                          {report.status.toLowerCase()}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-[var(--ink-muted)]">{report.reason}</p>
                      <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                        Reported {new Date(report.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {listing && (
                        <LinkButton href={`/listings/${listing.slug}`} size="sm" variant="ghost">
                          <ExternalLink size={13} /> Inspect
                        </LinkButton>
                      )}
                      <form action={resolveReportAction}>
                        <input type="hidden" name="reportId" value={report.id} />
                        <input type="hidden" name="resolution" value="RESOLVED" />
                        <input type="hidden" name="returnTo" value="reports" />
                        <Button size="sm" disabled={report.status !== "OPEN" && report.status !== "REVIEWING"} type="submit">
                          <CheckCircle2 size={15} /> Resolve
                        </Button>
                      </form>
                      <form action={resolveReportAction}>
                        <input type="hidden" name="reportId" value={report.id} />
                        <input type="hidden" name="resolution" value="DISMISSED" />
                        <input type="hidden" name="returnTo" value="reports" />
                        <Button size="sm" variant="danger" disabled={report.status !== "OPEN" && report.status !== "REVIEWING"} type="submit">
                          <XCircle size={15} /> Dismiss
                        </Button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </SiteShell>
  );
}

function StatusMessage({ status }: { status: string }) {
  const copy: Record<string, string> = {
    ok: "Report updated.",
    forbidden: "Admin access required.",
    missing: "Report not found.",
    invalid: "Invalid action.",
    error: "Update failed."
  };
  const tone = status === "ok" ? "border-green-200 bg-green-50 text-green-800" : "border-[var(--accent)] bg-orange-50 text-[var(--accent-strong)]";
  return (
    <div className={`rounded-lg border p-4 text-sm font-semibold ${tone}`}>
      {copy[status] ?? "Action completed."}
    </div>
  );
}
