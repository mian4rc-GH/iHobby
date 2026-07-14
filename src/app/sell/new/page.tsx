import { Boxes, Camera, CheckCircle2, CircleDollarSign, Images, PackageCheck, Sparkles } from "lucide-react";
import type { ReactNode, SelectHTMLAttributes } from "react";
import { createListingAction } from "@/app/sell/new/actions";
import { AccessPanel } from "@/components/access-panel";
import { AiListingAssistant } from "@/components/ai-listing-assistant";
import { MultiPhotoUpload } from "@/components/photo-upload";
import { SiteShell } from "@/components/site-shell";
import { Badge, Button, Card, Field, Input, LinkButton, Textarea } from "@/components/ui";
import { getCurrentActor } from "@/lib/auth";
import { listings, rcScope } from "@/lib/data";
import { can } from "@/lib/rbac";
import { listMarketplaceCategories } from "@/lib/server/marketplace";

export default async function NewListingPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const actor = await getCurrentActor();
  const { status } = await searchParams;

  if (!can(actor.role, "listing:create")) {
    return (
      <SiteShell>
        <AccessPanel title="Seller or admin access required" />
      </SiteShell>
    );
  }

  const sample = listings[0];
  const categories = await listMarketplaceCategories();

  return (
    <SiteShell>
      <div className="page-head">
        <div>
          <Badge tone="accent">New listing</Badge>
          <h1 className="page-title mt-3">Create RC listing</h1>
          <div className="page-sub">RC scope, proof media, pricing, shipping, boost, and AI draft help.</div>
        </div>
        <div className="page-actions">
          <LinkButton href="/sell/listings">
            <Boxes size={16} /> My listings
          </LinkButton>
        </div>
      </div>

      {status ? <StatusMessage status={status} /> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form action={createListingAction} className="grid gap-4" id="listing-form">
          <ListingSection
            icon={<Boxes size={16} />}
            title="Scope"
            aside={<Badge tone="info">Vehicle or component</Badge>}
          >
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Listing scope">
                <SelectControl name="scope" defaultValue="vehicles">
                  {rcScope.sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </SelectControl>
              </Field>
              <Field label="Vehicle family">
                <SelectControl name="categorySlug" defaultValue={sample.categorySlug}>
                  {categories.map((category) => (
                    <option key={category.slug} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </SelectControl>
              </Field>
              <Field label="Component type">
                <SelectControl name="componentType" defaultValue="all">
                  <option value="all">None / Vehicle</option>
                  {rcScope.componentTypes.drones.map((component) => (
                    <option key={component.id} value={component.id}>
                      {component.name}
                    </option>
                  ))}
                </SelectControl>
              </Field>
            </div>
          </ListingSection>

          <ListingSection
            icon={<PackageCheck size={16} />}
            title="Item details"
            aside={<Badge>Required RC fields</Badge>}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Title">
                <Input name="title" defaultValue={sample.title} />
              </Field>
              <Field label="Condition">
                <SelectControl name="condition" defaultValue={sample.condition}>
                  {["New", "Like new", "Excellent", "Very good", "Good", "For parts"].map((condition) => (
                    <option key={condition} value={condition}>{condition}</option>
                  ))}
                </SelectControl>
              </Field>
              <Field label="Brand">
                <Input name="brand" defaultValue={String(sample.attributes.brand ?? "")} />
              </Field>
              <Field label="Model">
                <Input name="model" defaultValue={String(sample.attributes.model ?? "")} />
              </Field>
              <Field label="Year">
                <Input name="year" defaultValue="2024" inputMode="numeric" />
              </Field>
              <Field label="Serial / proof">
                <Input name="serialProof" defaultValue="Serial photo attached" />
              </Field>
              <Field label="Flight time / runtime">
                <Input name="runtime" defaultValue={String(sample.attributes.flightTime ?? "40 min")} />
              </Field>
              <Field label="Ships from">
                <Input name="location" defaultValue={sample.location} />
              </Field>
            </div>
            <div className="mt-4 grid gap-4">
              <Field label="Included accessories">
                <Textarea name="accessories" defaultValue="Six batteries, RC-2 controller, ND filters, charger, spare props, and hard case." />
              </Field>
              <Field label="Description">
                <Textarea name="description" defaultValue={sample.description} />
              </Field>
            </div>
          </ListingSection>

          <ListingSection
            icon={<Images size={16} />}
            title="Photos"
            aside={<Badge tone="good">8 max</Badge>}
          >
            <MultiPhotoUpload label="Add photos" maxPhotos={8} />
          </ListingSection>

          <ListingSection
            icon={<CircleDollarSign size={16} />}
            title="Sale settings"
            aside={<Badge tone="warn">Review queue</Badge>}
          >
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Listing type">
                <SelectControl name="listingType" defaultValue="AUCTION">
                  <option value="AUCTION">Auction</option>
                  <option value="FIXED_PRICE">Fixed price</option>
                  <option value="OFFER">Offers</option>
                </SelectControl>
              </Field>
              <Field label="Start price ($)">
                <Input name="startPrice" defaultValue="640" inputMode="decimal" />
              </Field>
              <Field label="Reserve price ($)">
                <Input name="reservePrice" defaultValue="700" inputMode="decimal" />
              </Field>
              <Field label="Buy now ($)">
                <Input name="buyNow" defaultValue="820" inputMode="decimal" />
              </Field>
              <Field label="Duration">
                <SelectControl name="duration" defaultValue="7">
                  <option value="3">3 days</option>
                  <option value="5">5 days</option>
                  <option value="7">7 days</option>
                  <option value="10">10 days</option>
                </SelectControl>
              </Field>
              <Field label="Shipping">
                <SelectControl name="shipping" defaultValue="insured-ground">
                  <option value="insured-ground">Insured ground</option>
                  <option value="local-pickup">Local pickup</option>
                  <option value="seller-arranged">Seller arranged</option>
                </SelectControl>
              </Field>
            </div>
          </ListingSection>

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="submit" variant="primary">
              Submit for review
            </Button>
          </div>
        </form>

        <aside className="grid h-fit gap-4">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-[var(--green)]" />
              <h2 className="text-lg font-bold">Listing checks</h2>
            </div>
            <div className="mt-4 grid gap-2 text-sm">
              <CheckRow label="RC scope" />
              <CheckRow label="Ownership proof" />
              <CheckRow label="Pricing" />
              <CheckRow label="Shipping" />
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-[var(--accent)]" />
              <h2 className="text-lg font-bold">Boost</h2>
            </div>
            <div className="mt-3 grid gap-3 text-sm">
              <label className="flex items-center justify-between gap-3 rounded-md border border-[var(--line)] p-3">
                <span>Feature in Vehicles</span>
                <input type="checkbox" defaultChecked />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-md border border-[var(--line)] p-3">
                <span>Notify saved searches</span>
                <input type="checkbox" defaultChecked />
              </label>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Camera size={18} className="text-[var(--accent)]" />
              <h2 className="text-lg font-bold">Photo order</h2>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-[var(--ink-muted)]">
              <div className="flex items-center justify-between gap-3">
                <span>Cover</span>
                <Badge tone="accent">First image</Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Gallery</span>
                <Badge>All uploads</Badge>
              </div>
            </div>
          </Card>

          <AiListingAssistant />
        </aside>
      </div>
    </SiteShell>
  );
}

function ListingSection({
  icon,
  title,
  aside,
  children
}: {
  icon: ReactNode;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--background)] px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md border border-[var(--line)] bg-white text-[var(--accent)]">{icon}</span>
          <h2 className="text-lg font-bold">{title}</h2>
        </div>
        {aside}
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}

function CheckRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-[var(--background)] px-3 py-2">
      <span>{label}</span>
      <CheckCircle2 size={15} className="text-[var(--green)]" />
    </div>
  );
}

function SelectControl(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className="focus-ring h-10 rounded-md border border-[var(--line)] bg-white px-3 text-sm outline-none"
      {...props}
    />
  );
}

function StatusMessage({ status }: { status: string }) {
  const copy: Record<string, string> = {
    created: "Listing submitted for review.",
    invalid: "Please complete the required RC listing fields.",
    forbidden: "Seller or admin access is required to create listings.",
    error: "Listing could not be saved. Check database configuration."
  };

  return (
    <Card className="mb-4 border-[var(--accent)] bg-orange-50 p-4 text-sm font-semibold text-[var(--accent-strong)]">
      {copy[status] ?? "Listing action completed."}
    </Card>
  );
}
