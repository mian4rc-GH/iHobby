import { ShieldAlert } from "lucide-react";
import { Card, LinkButton } from "@/components/ui";

export function AccessPanel({ title }: { title: string }) {
  return (
    <Card className="grid place-items-center p-10 text-center">
      <ShieldAlert className="text-[var(--accent)]" size={34} />
      <h1 className="mt-3 text-xl font-bold">{title}</h1>
      <p className="mt-2 max-w-lg text-sm text-[var(--ink-muted)]">
        Sign in with an account that has the required role. New users start as buyers, seller access requires approval,
        and admin access is assigned manually.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <LinkButton href="/sign-in" variant="primary">Sign in</LinkButton>
        <LinkButton href="/" variant="secondary">Back to marketplace</LinkButton>
      </div>
    </Card>
  );
}
