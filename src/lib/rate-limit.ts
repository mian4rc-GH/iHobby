type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const maxBuckets = 10_000;
let lastPrunedAt = 0;

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  if (now - lastPrunedAt >= 60_000) {
    pruneExpiredBuckets(now);
    lastPrunedAt = now;
  }
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    if (buckets.size >= maxBuckets) {
      const oldestKey = buckets.keys().next().value;
      if (oldestKey !== undefined) buckets.delete(oldestKey);
    }
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (current.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterMs: current.resetAt - now, resetAt: current.resetAt };
  }

  current.count += 1;
  return { allowed: true, remaining: limit - current.count, resetAt: current.resetAt };
}

export function clientRateLimitKey(request: Request, namespace: string) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const candidate = forwarded || request.headers.get("x-real-ip") || "unknown";
  const identity = candidate.replace(/[^a-zA-Z0-9:._-]/g, "").slice(0, 64) || "unknown";
  return `${namespace}:ip:${identity}`;
}

export function retryAfterSeconds(result: ReturnType<typeof rateLimit>) {
  return Math.max(1, Math.ceil((result.retryAfterMs ?? 0) / 1000));
}

export function resetRateLimitsForTests() {
  buckets.clear();
  lastPrunedAt = 0;
}

function pruneExpiredBuckets(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}
