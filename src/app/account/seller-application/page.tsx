import { ClipboardCheck, Store } from "lucide-react";
import { submitSellerApplicationAction } from "@/app/account/seller-application/actions";
import { AccessPanel } from "@/components/access-panel";
import { SiteShell } from "@/components/site-shell";
import { Badge, Button, Card, Field, Input, Textarea } from "@/components/ui";
import { getCurrentActor } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getSellerApplicationForActor } from "@/lib/server/seller-applications";

export default async function SellerApplicationPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const actor = await getCurrentActor();
  const { status } = await searchParams;

  if (!actor.isAuthenticated) {
    return (
      <SiteShell>
        <AccessPanel title="Sign in to apply as a seller" />
      </SiteShell>
    );
  }

  if (actor.role === "SELLER") {
    return (
      <SiteShell>
        <Card className="mx-auto max-w-xl p-8 text-center">
          <Badge tone="good">Seller approved</Badge>
          <h1 className="mt-3 text-2xl font-bold">Your seller account is active</h1>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">You can create listings and use seller tools.</p>
        </Card>
      </SiteShell>
    );
  }

  if (!can(actor.role, "seller:apply")) {
    return (
      <SiteShell>
        <AccessPanel title="Buyer account required" />
      </SiteShell>
    );
  }

  const application = await getSellerApplicationForActor(actor);
  const hasPendingApplication = application?.status === "PENDING";

  return (
    <SiteShell>
      <div className="grid gap-5">
        <div>
          <Badge tone="accent">Seller application</Badge>
          <h1 className="mt-3 text-3xl font-bold">Apply to sell on iHobbyWorld</h1>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            Admin approval is required before listings can be published.
          </p>
        </div>
        {status ? <StatusMessage status={status} /> : null}
        {application ? <ApplicationDecision application={application} /> : null}
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          {hasPendingApplication ? (
            <Card className="p-5">
              <h2 className="text-lg font-bold">Application in review</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">You already have an application with the review team. Its latest status and reviewer note are shown above.</p>
            </Card>
          ) : (
            <Card className="p-5">
              <form action={submitSellerApplicationAction} className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Applicant">
                  <Input defaultValue={actor.displayName} readOnly />
                </Field>
                <Field label="Email">
                  <Input defaultValue={actor.email} readOnly />
                </Field>
                <Field label="Shop or seller name">
                  <Input name="businessName" defaultValue={`${actor.displayName}'s RC Bench`} />
                </Field>
                <Field label="Primary categories">
                  <Input name="categoryFocus" defaultValue="Drones, Cars, Components" />
                </Field>
              </div>
              <Field label="Seller experience">
                <Textarea
                  name="experience"
                  defaultValue="I sell verified RC vehicles and components, document ownership with serial proof, describe condition clearly, and use tracked insured shipping."
                />
              </Field>
              <div className="flex justify-end border-t border-[var(--line)] pt-4">
                <Button variant="primary">Submit application</Button>
              </div>
              </form>
            </Card>
          )}
          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Store size={20} /> Approval checks
            </h2>
            <div className="mt-4 grid gap-3 text-sm text-[var(--ink-muted)]">
              <span className="flex gap-2">
                <ClipboardCheck size={16} /> Identity and account health.
              </span>
              <span className="flex gap-2">
                <ClipboardCheck size={16} /> RC category fit and inventory quality.
              </span>
              <span className="flex gap-2">
                <ClipboardCheck size={16} /> Shipping and return expectations.
              </span>
            </div>
          </Card>
        </div>
      </div>
    </SiteShell>
  );
}

function ApplicationDecision({
  application
}: {
  application: { businessName: string; categoryFocus: string; status: "PENDING" | "APPROVED" | "REJECTED"; submittedAt: string; reviewedAt: string | null; notes: string | null };
}) {
  const tone = application.status === "APPROVED" ? "good" : application.status === "REJECTED" ? "bad" : "warn" as const;
  const heading = application.status === "PENDING" ? "Application awaiting review" : application.status === "APPROVED" ? "Application approved" : "Application not approved";
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">{heading}</h2><Badge tone={tone}>{application.status.toLowerCase()}</Badge></div>
      <div className="mt-3 grid gap-1 text-sm text-[var(--ink-muted)]"><span>{application.businessName} · {application.categoryFocus}</span><span>Submitted {new Date(application.submittedAt).toLocaleDateString("en-US")}</span>{application.reviewedAt ? <span>Reviewed {new Date(application.reviewedAt).toLocaleDateString("en-US")}</span> : null}</div>
      {application.notes ? <div className="mt-4 rounded-md border border-[var(--line)] bg-[var(--background)] p-3 text-sm"><div className="font-semibold">Reviewer note</div><p className="mt-1 whitespace-pre-wrap text-[var(--ink-muted)]">{application.notes}</p></div> : null}
    </Card>
  );
}

function StatusMessage({ status }: { status: string }) {
  const copy: Record<string, string> = {
    created: "Application submitted for admin review.",
    existing: "You already have a pending seller application.",
    invalid: "Please complete all required seller application fields.",
    error: "Application could not be saved. Check database configuration and try again."
  };

  return (
    <Card className="border-[var(--accent)] bg-orange-50 p-4 text-sm font-semibold text-[var(--accent-strong)]">
      {copy[status] ?? "Application status updated."}
    </Card>
  );
}
