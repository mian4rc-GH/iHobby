"use client";

import { BarChart3, Loader2, Sparkles, Tag } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button, Card, Field, Input } from "@/components/ui";
import { formatMoney } from "@/lib/money";

type PricingEstimatorData = {
  vehicleTypes: Array<{ id: string; name: string; count: number }>;
  selectedVehicleFamily: string;
  listingTitle: string;
  listingCondition: string;
  currentPriceCents: number;
  includedBatteries: number;
  comparableSales: Array<{ id: string; title: string; condition: string; soldPriceCents: number }>;
  guidance: { conservativeCents: number; recommendedCents: number; buyNowCents: number };
  note: string;
};

type MarketResult = Pick<PricingEstimatorData, "comparableSales" | "guidance" | "note">;

export function AiPricingEstimator({ pricing }: { pricing: PricingEstimatorData }) {
  const [vehicleType, setVehicleType] = useState(pricing.selectedVehicleFamily);
  const [title, setTitle] = useState(pricing.listingTitle);
  const [condition, setCondition] = useState(pricing.listingCondition);
  const [price, setPrice] = useState(pricing.currentPriceCents ? String(pricing.currentPriceCents / 100) : "");
  const [batteries, setBatteries] = useState(pricing.includedBatteries ? String(pricing.includedBatteries) : "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ text: string; provider: string } | null>(null);
  const [market, setMarket] = useState<MarketResult>({
    comparableSales: pricing.comparableSales,
    guidance: pricing.guidance,
    note: pricing.note
  });
  const [error, setError] = useState<string | null>(null);

  async function requestEstimate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const targetPriceCents = Math.round(Number(price) * 100);
    const batteryCount = Number(batteries);
    const hasBatteryCount = batteries.trim() !== "";

    if (!title.trim() || !condition.trim() || !Number.isFinite(targetPriceCents) || targetPriceCents <= 0 || (hasBatteryCount && (!Number.isInteger(batteryCount) || batteryCount < 0))) {
      setError("Enter a title, condition, price greater than zero, and a whole-number battery count.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/ai/pricing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category: vehicleType,
          condition: condition.trim(),
          targetPriceCents,
          attributes: hasBatteryCount ? { batteryCount } : {}
        })
      });
      const payload = await response.json() as Partial<MarketResult> & { text?: string; provider?: string; error?: string };

      if (!response.ok) {
        setError(payload.error ?? "AI pricing is temporarily unavailable.");
        return;
      }

      setResult({ text: payload.text ?? "No pricing recommendation returned.", provider: payload.provider ?? "AI" });
      if (payload.guidance && payload.comparableSales && payload.note) {
        setMarket({ guidance: payload.guidance, comparableSales: payload.comparableSales, note: payload.note });
      }
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
      <Card className="p-5">
        <form onSubmit={requestEstimate} className="grid gap-4">
          <Field label="Vehicle family">
            <select value={vehicleType} onChange={(event) => setVehicleType(event.target.value)} className="focus-ring h-10 rounded-md border border-[var(--line)] bg-white px-3 text-sm">
              {pricing.vehicleTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </Field>
          <Field label="Listing title"><Input value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
          <Field label="Condition"><Input value={condition} onChange={(event) => setCondition(event.target.value)} /></Field>
          <Field label="Current price"><Input value={price} onChange={(event) => setPrice(event.target.value)} inputMode="decimal" /></Field>
          <Field label="Included batteries"><Input value={batteries} onChange={(event) => setBatteries(event.target.value)} inputMode="numeric" /></Field>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? <><Loader2 size={16} className="animate-spin" /> Estimating...</> : <><Sparkles size={16} /> Recalculate with AI</>}
          </Button>
        </form>

        {error && <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>}
        {result && (
          <div className="mt-4 rounded-md border border-[var(--line)] bg-[var(--background)] p-3" aria-live="polite">
            <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--ink-muted)]">AI estimate · {result.provider}</div>
            <div className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[var(--ink)]">{result.text}</div>
          </div>
        )}
      </Card>

      <div className="grid gap-4">
        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold"><BarChart3 size={20} /> Range guidance</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Price label="Conservative" value={market.guidance.conservativeCents} />
            <Price label="Recommended" value={market.guidance.recommendedCents} />
            <Price label="Buy now" value={market.guidance.buyNowCents} />
          </div>
          <p className="mt-5 text-sm leading-6 text-[var(--ink-muted)]">{market.note}</p>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-[var(--line)] p-4"><h2 className="text-lg font-bold">Accepted marketplace offers</h2></div>
          <div className="divide-y divide-[var(--line)]">
            {market.comparableSales.length ? market.comparableSales.map((comp) => (
              <div key={comp.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div><div className="font-bold">{comp.title}</div><div className="mt-1 text-sm text-[var(--ink-muted)]">{comp.condition}</div></div>
                <div className="mono font-bold">{formatMoney(comp.soldPriceCents)}</div>
              </div>
            )) : <div className="p-4 text-sm text-[var(--ink-muted)]">No accepted marketplace offers have been recorded for this vehicle family yet.</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Price({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[var(--line)] bg-[var(--background)] p-4">
      <div className="flex items-center gap-2 text-sm text-[var(--ink-muted)]"><Tag size={15} /> {label}</div>
      <div className="mono mt-2 text-2xl font-bold">{formatMoney(value)}</div>
    </div>
  );
}
