import { CheckCircle2, XCircle } from "lucide-react";
import {
  approveSellerApplicationAction,
  rejectSellerApplicationAction
} from "@/app/admin/seller-applications/actions";
import { AccessPanel } from "@/components/access-panel";
import { SiteShell } from "@/components/site-shell";
import { Badge, Button, Card } from "@/components/ui";
import { getCurrentActor } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listSellerApplications } from "@/lib/server/seller-applications";

export default async function SellerApplicationsPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const actor = await getCurrentActor();
  const { status } = await searchParams;

  if (!can(actor.role, "admin:manage-users")) {
    return (
      <SiteShell>
        <AccessPanel title="Admin approval access required" />
      </SiteShell>
    );
  }

  const applications = await listSellerApplications();

  return (
    <SiteShell>
      <div className="grid gap-5">
        <div>
          <Badge tone="bad">Seller approvals</Badge>
          <h1 className="mt-3 text-3xl font-bold">Seller applications</h1>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            Admins approve seller access. Buyers cannot self-upgrade.
          </p>
        </div>
        {status ? <StatusMessage status={status} /> : null}
        <Card className="overflow-hidden">
          {applications.map((application) => (
            <div
              key={application.id}
              className="grid gap-4 border-b border-[var(--line)] p-4 last:border-b-0 lg:grid-cols-[1fr_auto] lg:items-center"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-bold">{application.businessName}</h2>
                  <Badge tone={application.status === "APPROVED" ? "good" : application.status === "REJECTED" ? "bad" : "warn"}>
                    {application.status.toLowerCase()}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-[var(--ink-muted)]">
                  {application.applicantName} - {application.applicantEmail} - {application.categoryFocus}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <form action={approveSellerApplicationAction}>
                  <input type="hidden" name="applicationId" value={application.id} />
                  <Button size="sm" disabled={application.status !== "PENDING"}>
                    <CheckCircle2 size={15} /> Approve
                  </Button>
                </form>
                <form action={rejectSellerApplicationAction}>
                  <input type="hidden" name="applicationId" value={application.id} />
                  <Button size="sm" variant="danger" disabled={application.status !== "PENDING"}>
                    <XCircle size={15} /> Reject
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </SiteShell>
  );
}

function StatusMessage({ status }: { status: string }) {
  const copy: Record<string, string> = {
    approved: "Seller application approved. The applicant role is now seller.",
    rejected: "Seller application rejected.",
    invalid: "Invalid seller application decision.",
    error: "Decision could not be saved. Check database configuration and try again."
  };

  return (
    <Card className="border-[var(--accent)] bg-orange-50 p-4 text-sm font-semibold text-[var(--accent-strong)]">
      {copy[status] ?? "Seller application status updated."}
    </Card>
  );
}
