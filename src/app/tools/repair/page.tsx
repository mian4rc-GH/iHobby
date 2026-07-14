import { ClipboardCheck, ShieldCheck, Wrench } from "lucide-react";
import Link from "next/link";
import { AccessPanel } from "@/components/access-panel";
import { SiteShell } from "@/components/site-shell";
import { Badge, Button, Card, Field, Input, LinkButton, Textarea } from "@/components/ui";
import { createRepairDiagnosisAction } from "@/app/tools/repair/actions";
import { getCurrentActor } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { getRepairAdvisorDataForActor } from "@/lib/server/marketplace";

export default async function RepairAdvisorPage({
  searchParams
}: {
  searchParams: Promise<{ new?: string; session?: string; status?: string }>;
}) {
  const actor = await getCurrentActor();
  const { new: isNew, session: sessionId, status } = await searchParams;

  if (!can(actor.role, "ai:use")) {
    return (
      <SiteShell>
        <AccessPanel title="Member access required" />
      </SiteShell>
    );
  }

  const repair = await getRepairAdvisorDataForActor(actor);
  const activeSession = repair.sessions.find((session) => session.id === sessionId) ?? repair.activeSession;

  return (
    <SiteShell>
      <div className="page-head">
        <div>
          <Badge tone="info">Repair</Badge>
          <h1 className="page-title mt-3">Repair Advisor</h1>
          <div className="page-sub">Structured RC triage for symptoms, parts, service notes, and resale disclosure.</div>
        </div>
        <LinkButton href="/tools/repair?new=1" variant="primary">
          <Wrench size={16} /> New diagnosis
        </LinkButton>
      </div>

      {status ? <RepairStatus status={status} /> : null}

      <div className="chat-shell">
        <aside className="chat-list">
          {repair.sessions.length ? (
            repair.sessions.map((session) => (
              <Link href={`/tools/repair?session=${session.id}`} key={session.id} className={session.id === activeSession?.id ? "chat-item active" : "chat-item"}>
                <div className="grid size-8 place-items-center rounded-md bg-[var(--bg-2)] text-[var(--teal)]">
                  <Wrench size={16} />
                </div>
                <div className="min-w-0">
                  <div className="font-bold">{session.title}</div>
                  <div className="truncate text-xs text-[var(--ink-muted)]">{session.lastSummary}</div>
                </div>
                <span className="mono ml-auto text-[10px] text-[var(--ink-4)]">{session.when}</span>
              </Link>
            ))
          ) : (
            <div className="p-4 text-sm text-[var(--ink-muted)]">No repair sessions have been saved for this account.</div>
          )}
        </aside>

        <section className="chat-main">
          <div className="chat-head">
            <ClipboardCheck size={18} />
            <div>
              <div className="font-bold">{activeSession ? `${activeSession.title} diagnosis` : "No diagnosis selected"}</div>
              <div className="text-xs text-[var(--ink-muted)]">
                {activeSession ? `${formatVehicleType(activeSession.vehicleType)} repair check` : "Create a repair session to start triage"}
              </div>
            </div>
          </div>
          <div className="chat-body">
            {isNew ? (
              <Card className="p-4">
                <form action={createRepairDiagnosisAction} className="grid gap-4">
                  <Field label="Diagnosis title"><Input name="title" placeholder="e.g. Motor vibration after a crash" required /></Field>
                  <Field label="Vehicle family">
                    <select name="vehicleType" defaultValue="drones" className="focus-ring h-10 rounded-md border border-[var(--line)] bg-white px-3 text-sm">
                      <option value="drones">Drone</option><option value="helis">Helicopter</option><option value="planes">Plane</option><option value="cars">Car</option>
                    </select>
                  </Field>
                  <Field label="Symptoms and test notes"><Textarea name="issueNotes" placeholder="Describe symptoms, recent changes, test results, and any visible damage." required /></Field>
                  <div className="flex justify-end gap-2"><LinkButton href="/tools/repair" variant="ghost">Cancel</LinkButton><Button variant="primary">Create diagnosis</Button></div>
                </form>
              </Card>
            ) : activeSession ? (
              <>
                <div className="msg them">{activeSession.issueNotes}</div>
                <div className="msg ai">{activeSession.advisorNote}</div>
                <div className="grid gap-2 rounded-md border border-[var(--line)] bg-white p-4 text-sm">
                  <div className="font-bold">Suggested checklist</div>
                  {activeSession.checklist.map((item) => (
                    <span key={item} className="flex gap-2 text-[var(--ink-muted)]">
                      <ShieldCheck size={16} /> {item}
                    </span>
                  ))}
                </div>
                <div className="msg me">Add this checklist to the seller disclosure for the draft listing.</div>
              </>
            ) : (
              <div className="msg ai">No repair data has been saved for this account yet.</div>
            )}
          </div>
          <div className="chat-compose text-sm text-[var(--ink-muted)]">Need another issue reviewed? <Link href="/tools/repair?new=1" className="font-semibold text-[var(--accent-strong)]">Start a new diagnosis</Link>.</div>
        </section>
      </div>
    </SiteShell>
  );
}

function RepairStatus({ status }: { status: string }) {
  const copy: Record<string, string> = {
    created: "Diagnosis saved. The advisor response and checklist are now available in this session.",
    invalid: "Enter a title and at least ten characters describing the issue.",
    forbidden: "You do not have permission to create repair diagnoses.",
    error: "The diagnosis could not be saved. Please try again."
  };
  return <Card className="mb-5 border-[var(--accent)] bg-orange-50 p-4 text-sm font-semibold text-[var(--accent-strong)]">{copy[status] ?? "Repair session status updated."}</Card>;
}

function formatVehicleType(value: string) {
  if (value === "helis") return "Helicopter";
  if (value === "planes") return "Plane";
  if (value === "cars") return "Car";
  return "Drone";
}
