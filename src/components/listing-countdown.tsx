"use client";

import { useEffect, useState } from "react";

export function ListingCountdown({ endsAt }: { endsAt: string }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const remainingMs = Math.max(0, new Date(endsAt).getTime() - now);
  const days = Math.floor(remainingMs / 86_400_000);
  const hours = Math.floor((remainingMs % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remainingMs % 3_600_000) / 60_000);
  const seconds = Math.floor((remainingMs % 60_000) / 1_000);

  return (
    <div className="countdown" aria-label="Auction countdown" aria-live="polite">
      <CountCell value={pad(days)} label="Days" />
      <CountCell value={pad(hours)} label="Hours" />
      <CountCell value={pad(minutes)} label="Min" />
      <CountCell value={pad(seconds)} label="Sec" />
    </div>
  );
}

function CountCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="count-cell">
      <div className="count-num mono">{value}</div>
      <div className="count-lbl mono upper">{label}</div>
    </div>
  );
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}
