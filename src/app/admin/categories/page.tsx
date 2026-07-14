import { PlusCircle } from "lucide-react";
import { createCategoryAction, toggleCategoryAction, updateCategoryAction } from "@/app/admin/categories/actions";
import { AccessPanel } from "@/components/access-panel";
import { SiteShell } from "@/components/site-shell";
import { Badge, Button, Card, Field, Input } from "@/components/ui";
import { getCurrentActor } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listAdminCategories } from "@/lib/server/marketplace";

export default async function AdminCategoriesPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string; add?: string }>;
}) {
  const actor = await getCurrentActor();
  const { status, add } = await searchParams;

  if (!can(actor.role, "admin:manage-categories")) {
    return (
      <SiteShell>
        <AccessPanel title="Admin category access required" />
      </SiteShell>
    );
  }

  const categories = await listAdminCategories();

  return (
    <SiteShell>
      <div className="grid gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Badge tone="bad">Taxonomy</Badge>
            <h1 className="mt-3 text-3xl font-bold">RC marketplace taxonomy</h1>
            <p className="mt-2 text-sm text-[var(--ink-muted)]">
              {categories.length} categories. Add or edit RC vehicle and component categories.
            </p>
          </div>
          <a
            href="/admin/categories?add=1"
            className="btn-primary inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm font-semibold"
          >
            <PlusCircle size={16} /> Add category
          </a>
        </div>

        {status ? <StatusMessage status={status} /> : null}

        {add === "1" && (
          <Card className="p-5">
            <h2 className="mb-4 text-lg font-bold">New category</h2>
            <form action={createCategoryAction} className="grid gap-4 md:grid-cols-2">
              <Field label="Name">
                <Input name="name" placeholder="e.g. FPV Racing Quads" required />
              </Field>
              <Field label="Slug">
                <Input name="slug" placeholder="e.g. fpv-racing-quads" pattern="[a-z0-9-]+" required />
              </Field>
              <div className="md:col-span-2">
                <Field label="Description">
                  <Input name="description" placeholder="Short description for buyers and sellers" />
                </Field>
              </div>
              <div className="flex gap-2 md:col-span-2">
                <Button type="submit" variant="primary">Create category</Button>
                <a href="/admin/categories" className="btn inline-flex h-9 items-center rounded-md border border-[var(--line)] bg-white px-4 text-sm font-semibold">
                  Cancel
                </a>
              </div>
            </form>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <Card key={category.slug} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold">{category.name}</h2>
                    <Badge tone="neutral" className="shrink-0">{category.slug}</Badge>
                    <Badge tone={category.active ? "good" : "bad"}>{category.active ? "active" : "inactive"}</Badge>
                  </div>
                  <p className="mt-1.5 text-sm leading-5 text-[var(--ink-muted)]">{category.description}</p>
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">
                    {category.listingCount} listing{category.listingCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {category.attributes.required.map((attribute) => (
                  <Badge key={attribute} tone="accent">{attribute}</Badge>
                ))}
              </div>

              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold text-[var(--ink-muted)] hover:text-[var(--ink)]">
                  Edit
                </summary>
                <form action={updateCategoryAction} className="mt-3 grid gap-3">
                  <input type="hidden" name="categoryId" value={category.id} />
                  <Field label="Name">
                    <Input name="name" defaultValue={category.name} />
                  </Field>
                  <Field label="Description">
                    <Input name="description" defaultValue={category.description} />
                  </Field>
                  <div>
                    <Button size="sm" type="submit" variant="primary">Save</Button>
                  </div>
                </form>
                <form action={toggleCategoryAction} className="mt-2">
                  <input type="hidden" name="categoryId" value={category.id} />
                  <input type="hidden" name="active" value={category.active ? "false" : "true"} />
                  <Button size="sm" variant={category.active ? "danger" : "secondary"} type="submit">
                    {category.active ? "Deactivate" : "Reactivate"}
                  </Button>
                </form>
              </details>
            </Card>
          ))}
        </div>
      </div>
    </SiteShell>
  );
}

function StatusMessage({ status }: { status: string }) {
  const copy: Record<string, string> = {
    created: "Category created successfully.",
    ok: "Category updated.",
    conflict: "A category with that slug already exists.",
    forbidden: "Admin category access required.",
    missing: "Category not found.",
    invalid: "Invalid input. Check all fields.",
    error: "Action failed. Check database configuration."
  };
  const tone = status === "created" || status === "ok"
    ? "border-green-200 bg-green-50 text-green-800"
    : "border-[var(--accent)] bg-orange-50 text-[var(--accent-strong)]";
  return (
    <div className={`rounded-lg border p-4 text-sm font-semibold ${tone}`}>
      {copy[status] ?? "Action completed."}
    </div>
  );
}
