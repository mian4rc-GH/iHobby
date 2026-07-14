"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button, Card } from "@/components/ui";

export function AiListingAssistant() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runAssistant() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const form = document.getElementById("listing-form") as HTMLFormElement | null;
      const data = form ? new FormData(form) : new FormData();

      const payload = {
        title: (data.get("title") as string) || "",
        category: (data.get("categorySlug") as string) || "drones",
        condition: (data.get("condition") as string) || "",
        description: (data.get("description") as string) || ""
      };

      if (!payload.title || !payload.description) {
        setError("Fill in the title and description first.");
        return;
      }

      const res = await fetch("/api/ai/listing-assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await res.json() as { text?: string; error?: string };

      if (!res.ok) {
        setError(json.error ?? "AI assistant returned an error.");
        return;
      }

      setResult(json.text ?? "No suggestions returned.");
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-sm font-bold">
        <Sparkles size={17} className="text-[var(--accent)]" /> AI listing assistant
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
        Get concrete recommendations on your listing title, description gaps, and trust steps.
      </p>

      <Button
        onClick={runAssistant}
        disabled={loading}
        className="mt-4 w-full"
        variant="primary"
        type="button"
      >
        {loading ? (
          <><Loader2 size={15} className="animate-spin" /> Analysing…</>
        ) : (
          <><Sparkles size={15} /> Improve draft</>
        )}
      </Button>

      {error && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-3 rounded-md border border-[var(--line)] bg-[var(--background)] p-3">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--ink-muted)]">
            AI recommendations
          </div>
          <div className="whitespace-pre-wrap text-sm leading-6 text-[var(--ink)]">{result}</div>
        </div>
      )}
    </Card>
  );
}
