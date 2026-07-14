import { Badge, Card } from "@/components/ui";
import type { DashboardMetric } from "@/types/domain";

export function MetricGrid({ metrics }: { metrics: DashboardMetric[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.label} className="p-4">
          <div className="text-xs font-semibold uppercase text-[var(--ink-muted)]">{metric.label}</div>
          <div className="mt-2 text-3xl font-bold">{metric.value}</div>
          <Badge className="mt-3" tone={metric.tone === "neutral" ? "neutral" : metric.tone}>
            {metric.delta}
          </Badge>
        </Card>
      ))}
    </div>
  );
}
