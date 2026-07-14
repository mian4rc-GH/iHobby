import { SignIn } from "@clerk/nextjs";
import { LogIn, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { SiteShell } from "@/components/site-shell";
import { Badge, Button, Card, Field, Input } from "@/components/ui";
import { getCurrentActor } from "@/lib/auth";
import { defaultDashboardFor } from "@/lib/rbac";

export default async function SignInPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const actor = await getCurrentActor();
  const { status } = await searchParams;

  if (actor.isAuthenticated) {
    return (
      <SiteShell>
        <Card className="mx-auto max-w-xl p-8 text-center">
          <Badge tone="good">Already signed in</Badge>
          <h1 className="mt-3 text-2xl font-bold">You are signed in as {actor.displayName}</h1>
          <Link className="btn-control btn-primary mt-5 h-10 px-4" href={defaultDashboardFor(actor.role)}>
            Go to dashboard
          </Link>
        </Card>
      </SiteShell>
    );
  }

  if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY) {
    return (
      <SiteShell>
        <div className="mx-auto grid max-w-md place-items-center">
          <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="mx-auto grid max-w-4xl gap-5">
        <div>
          <Badge tone="info">Credentials</Badge>
          <h1 className="mt-3 text-3xl font-bold">Sign in</h1>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
            Sign in with your registered iHobbyWorld account.
          </p>
        </div>

        {status ? <StatusMessage status={status} /> : null}

        <div className="grid max-w-xl gap-4">
          <Card className="p-5">
            <form action="/api/auth/sign-in" method="post" className="grid gap-4">
              <Field label="Email">
                <Input name="email" type="email" required />
              </Field>
              <Field label="Password">
                <Input name="password" type="password" required />
              </Field>
              <Button type="submit" variant="primary">
                <LogIn size={16} /> Sign in
              </Button>
            </form>
          </Card>
        </div>

        <Card className="flex gap-3 p-4 text-sm text-[var(--ink-muted)]">
          <ShieldCheck className="mt-0.5 shrink-0 text-[var(--teal)]" size={18} />
          <span>
            New users start as buyers. Seller access is approved by admins. Admin access is assigned by an existing admin or platform owner.
          </span>
        </Card>
      </div>
    </SiteShell>
  );
}

function StatusMessage({ status }: { status: string }) {
  const copy: Record<string, string> = {
    invalid: "Invalid email or password.",
    "rate-limited": "Too many sign-in attempts. Try again later.",
    registered: "Buyer account created. Sign in with your credentials."
  };

  return (
    <div className="rounded-lg border border-[var(--accent)] bg-orange-50 p-4 text-sm font-semibold text-[var(--accent-strong)]">
      {copy[status] ?? "Sign-in status updated."}
    </div>
  );
}
