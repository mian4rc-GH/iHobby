import { changeUserRoleAction, changeUserStatusAction, updateUserProfileAction } from "@/app/admin/users/actions";
import { AccessPanel } from "@/components/access-panel";
import { SiteShell } from "@/components/site-shell";
import { Badge, Button, Card, Field, Input } from "@/components/ui";
import { getCurrentActor } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listAdminUsers } from "@/lib/server/marketplace";
import type { Role } from "@/types/domain";

export default async function AdminUsersPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const actor = await getCurrentActor();
  const { status, q } = await searchParams;

  if (!can(actor.role, "admin:manage-users")) {
    return (
      <SiteShell>
        <AccessPanel title="Admin user access required" />
      </SiteShell>
    );
  }

  const allUsers = await listAdminUsers();
  const filtered = q
    ? allUsers.filter(
        (u) =>
          u.displayName.toLowerCase().includes(q.toLowerCase()) ||
          u.email.toLowerCase().includes(q.toLowerCase()) ||
          u.handle.toLowerCase().includes(q.toLowerCase())
      )
    : allUsers;

  return (
    <SiteShell>
      <div className="grid gap-5">
        <div>
          <Badge tone="bad">Users</Badge>
          <h1 className="mt-3 text-3xl font-bold">Members and roles</h1>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            {allUsers.length} registered members. Edit account details, change roles, and manage account status.
          </p>
        </div>

        {status ? <StatusMessage status={status} /> : null}

        <form method="GET" className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search by name, email, or handle…"
            className="focus-ring h-9 flex-1 rounded-md border border-[var(--line)] bg-white px-3 text-sm"
          />
          <Button type="submit" size="sm">Search</Button>
        </form>

        <Card className="overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-[var(--ink-muted)]">No users matched.</div>
          ) : (
            <div className="divide-y divide-[var(--line)]">
              {filtered.map((user) => (
                <div key={user.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">{user.displayName}</span>
                      <RoleBadge role={user.role} />
                      <StatusBadge status={user.status} />
                      {user.listingCount > 0 && (
                        <span className="text-xs text-[var(--ink-muted)]">{user.listingCount} listing{user.listingCount !== 1 ? "s" : ""}</span>
                      )}
                    </div>
                    <div className="mt-0.5 text-sm text-[var(--ink-muted)]">
                      @{user.handle} · {user.email}
                    </div>
                    <div className="mt-0.5 text-xs text-[var(--ink-muted)]">
                      Joined {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)]">
                        Edit profile
                      </summary>
                      <form action={updateUserProfileAction} className="mt-3 grid gap-3 rounded-md border border-[var(--line)] bg-[var(--background)] p-3 sm:grid-cols-3">
                        <input type="hidden" name="userId" value={user.id} />
                        <Field label="Display name">
                          <Input name="displayName" defaultValue={user.displayName} required />
                        </Field>
                        <Field label="Handle">
                          <Input name="handle" defaultValue={user.handle} pattern="[a-z0-9][a-z0-9_-]*" required />
                        </Field>
                        <Field label="Email">
                          <Input name="email" defaultValue={user.email} type="email" required />
                        </Field>
                        <div className="sm:col-span-3">
                          <Button size="sm" type="submit" variant="primary">Save profile</Button>
                        </div>
                      </form>
                    </details>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <form action={changeUserRoleAction}>
                      <input type="hidden" name="userId" value={user.id} />
                      <div className="flex gap-1.5">
                        <select
                          name="role"
                          defaultValue={user.role}
                          className="focus-ring h-8 rounded-md border border-[var(--line)] bg-white px-2 text-xs"
                        >
                          <option value="BUYER">Buyer</option>
                          <option value="SELLER">Seller</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                        <Button size="sm" type="submit">Set role</Button>
                      </div>
                    </form>
                    {user.status !== "SUSPENDED" && (
                      <StatusAction userId={user.id} status="SUSPENDED" label="Suspend" variant="danger" />
                    )}
                    {user.status !== "ACTIVE" && (
                      <StatusAction userId={user.id} status="ACTIVE" label="Reactivate" variant="ghost" />
                    )}
                    {user.status !== "CLOSED" && (
                      <StatusAction userId={user.id} status="CLOSED" label="Close" variant="danger" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </SiteShell>
  );
}

function RoleBadge({ role }: { role: Role }) {
  const map: Record<Role, "bad" | "accent" | "info" | "neutral"> = {
    ADMIN: "bad",
    SELLER: "accent",
    BUYER: "info",
    VISITOR: "neutral"
  };
  return <Badge tone={map[role]}>{role.toLowerCase()}</Badge>;
}

function StatusBadge({ status }: { status: "ACTIVE" | "SUSPENDED" | "CLOSED" }) {
  const map: Record<"ACTIVE" | "SUSPENDED" | "CLOSED", "good" | "bad" | "neutral"> = {
    ACTIVE: "good",
    SUSPENDED: "bad",
    CLOSED: "neutral"
  };
  return <Badge tone={map[status]}>{status.toLowerCase()}</Badge>;
}

function StatusAction({
  userId,
  status,
  label,
  variant
}: {
  userId: string;
  status: "ACTIVE" | "SUSPENDED" | "CLOSED";
  label: string;
  variant: "ghost" | "danger";
}) {
  return (
    <form action={changeUserStatusAction}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="status" value={status} />
      <Button size="sm" variant={variant} type="submit">
        {label}
      </Button>
    </form>
  );
}

function StatusMessage({ status }: { status: string }) {
  const copy: Record<string, string> = {
    ok: "User updated successfully.",
    forbidden: "Admin access required.",
    missing: "User not found.",
    conflict: "Email or handle is already assigned to another user.",
    invalid: "Invalid action.",
    error: "Update failed. Check database configuration."
  };
  const tone = status === "ok" ? "border-green-200 bg-green-50 text-green-800" : "border-[var(--accent)] bg-orange-50 text-[var(--accent-strong)]";
  return (
    <div className={`rounded-lg border p-4 text-sm font-semibold ${tone}`}>
      {copy[status] ?? "Action completed."}
    </div>
  );
}
