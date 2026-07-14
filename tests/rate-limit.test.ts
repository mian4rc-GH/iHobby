import { beforeEach, describe, expect, it } from "vitest";
import { clientRateLimitKey, rateLimit, resetRateLimitsForTests, retryAfterSeconds } from "@/lib/rate-limit";

describe("rate limiting", () => {
  beforeEach(() => {
    resetRateLimitsForTests();
  });

  it("blocks requests after the configured limit and returns a retry delay", () => {
    expect(rateLimit("test", 2, 60_000).allowed).toBe(true);
    expect(rateLimit("test", 2, 60_000).allowed).toBe(true);

    const blocked = rateLimit("test", 2, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(retryAfterSeconds(blocked)).toBeGreaterThan(0);
  });

  it("uses the first forwarded address as a stable client key", () => {
    const request = new Request("https://ihobbyworld.example/api/auth/sign-in", {
      headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" }
    });

    expect(clientRateLimitKey(request, "auth:sign-in")).toBe("auth:sign-in:ip:203.0.113.9");
  });
});
