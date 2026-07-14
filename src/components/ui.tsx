import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Button({
  className,
  variant = "secondary",
  size = "default",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "default" | "sm";
}) {
  return (
    <button
      className={cn(
        "btn-control focus-ring h-10 px-4",
        size === "sm" && "h-8 px-3 text-xs",
        variant === "primary" && "btn-primary",
        variant === "secondary" && "btn-secondary hover:bg-[var(--surface-muted)]",
        variant === "ghost" && "btn-ghost hover:bg-white",
        variant === "danger" && "btn-danger hover:brightness-95",
        className
      )}
      {...props}
    />
  );
}

export function LinkButton({
  className,
  variant = "secondary",
  size = "default",
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    variant?: "primary" | "secondary" | "ghost";
    size?: "default" | "sm";
    children: ReactNode;
  }) {
  return (
    <Link
      className={cn(
        "btn-control focus-ring h-10 px-4",
        size === "sm" && "h-8 px-3 text-xs",
        variant === "primary" && "btn-primary",
        variant === "secondary" && "btn-secondary hover:bg-[var(--surface-muted)]",
        variant === "ghost" && "btn-ghost hover:bg-white",
        className
      )}
      {...props}
    >
      {children}
    </Link>
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-lg border border-[var(--line)] bg-white", className)} {...props} />;
}

export function Badge({
  className,
  tone = "neutral",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: "neutral" | "accent" | "good" | "warn" | "bad" | "info" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        tone === "neutral" && "border-[var(--line)] bg-[var(--background)] text-[var(--ink-muted)]",
        tone === "accent" && "border-transparent bg-orange-100 text-[var(--accent-strong)]",
        tone === "good" && "border-transparent bg-emerald-100 text-[var(--green)]",
        tone === "warn" && "border-transparent bg-amber-100 text-amber-800",
        tone === "bad" && "border-transparent bg-red-100 text-[var(--red)]",
        tone === "info" && "border-transparent bg-blue-100 text-[var(--blue)]",
        className
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  children,
  hint
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-semibold text-[var(--ink)]">
      <span>{label}</span>
      {children}
      {hint ? <span className="text-xs font-normal text-[var(--ink-muted)]">{hint}</span> : null}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="focus-ring h-10 rounded-md border border-[var(--line)] bg-white px-3 text-sm outline-none"
      {...props}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className="focus-ring min-h-28 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none"
      {...props}
    />
  );
}
