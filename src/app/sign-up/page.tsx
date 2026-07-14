import { SignUp } from "@clerk/nextjs";
import { ShieldCheck, UserPlus } from "lucide-react";
import { SiteShell } from "@/components/site-shell";
import { Badge, Button, Card, Field, Input, LinkButton } from "@/components/ui";

export default async function SignUpPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;

  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY) {
    return (
      <SiteShell>
        <div className="mx-auto grid max-w-md place-items-center">
          <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="mx-auto grid max-w-3xl gap-5">
        <div>
          <Badge tone="info">Registration</Badge>
          <h1 className="mt-3 text-3xl font-bold">Create a buyer account</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
            Buyer accounts can bid, make offers, message sellers, save listings, and request seller access.
          </p>
        </div>

        {status ? <StatusMessage status={status} /> : null}

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Card className="p-5">
            <form action="/api/auth/register" method="post" className="grid gap-4">
              <Field label="Display name">
                <Input name="displayName" required minLength={2} maxLength={80} />
              </Field>
              <Field label="Email">
                <Input name="email" type="email" required maxLength={120} />
              </Field>
              <Field label="Password">
                <Input name="password" type="password" required minLength={12} maxLength={128} />
              </Field>
              <Button type="submit" variant="primary">
                <UserPlus size={16} /> Create account
              </Button>
            </form>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-[var(--teal)]" />
              <h2 className="text-lg font-bold">Access upgrades</h2>
            </div>
            <div className="mt-4 grid gap-3 text-sm text-[var(--ink-muted)]">
              <p>New accounts are buyers by default.</p>
              <p>Admins manage role changes, suspended accounts, closed accounts, and profile details.</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <LinkButton href="/account/seller-application" size="sm">Seller application</LinkButton>
              <LinkButton href="/admin/users" size="sm" variant="ghost">Admin users</LinkButton>
            </div>
          </Card>
        </div>
      </div>
    </SiteShell>
  );
}

function StatusMessage({ status }: { status: string }) {
  const copy: Record<string, string> = {
    invalid: "Use a 12-character password with uppercase, lowercase, and numeric characters.",
    conflict: "That email address is already registered.",
    "rate-limited": "Too many registration attempts. Try again later.",
    error: "Account could not be created."
  };

  return (
    <div className="rounded-lg border border-[var(--accent)] bg-orange-50 p-4 text-sm font-semibold text-[var(--accent-strong)]">
      {copy[status] ?? "Registration status updated."}
    </div>
  );
}
