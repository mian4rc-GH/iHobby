import { afterEach, describe, expect, it, vi } from "vitest";
import { completeAiText } from "@/lib/ai/providers";

describe("ai providers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses mock mode when no provider key is configured", async () => {
    vi.stubEnv("AI_PROVIDER", "mock");
    const result = await completeAiText({
      feature: "pricing",
      system: "test",
      prompt: "test"
    });

    expect(result.provider).toBe("mock");
    expect(result.text).toContain("Estimated market range");
  });

  it("falls back to mock mode when Groq is selected without a key", async () => {
    vi.stubEnv("AI_PROVIDER", "groq");
    vi.stubEnv("GROQ_API_KEY", "");

    const result = await completeAiText({
      feature: "listing",
      system: "test",
      prompt: "test"
    });

    expect(result.provider).toBe("mock");
    expect(result.text).toContain("Recommended title");
  });
});
