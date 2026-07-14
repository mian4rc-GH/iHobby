import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentActor } from "@/lib/auth";
import { completeAiText } from "@/lib/ai/providers";
import { rateLimit } from "@/lib/rate-limit";
import { can } from "@/lib/rbac";
import { getPricingGuidanceForInput } from "@/lib/server/marketplace";

const requestSchema = z.object({
  title: z.string().min(1).max(140),
  category: z.string().min(1).max(80),
  condition: z.string().min(1).max(80),
  targetPriceCents: z.number().int().positive(),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({})
});

export async function POST(request: Request) {
  const actor = await getCurrentActor();
  if (!can(actor.role, "ai:use")) {
    return NextResponse.json({ error: "AI access requires a member role." }, { status: 403 });
  }

  const limited = rateLimit(`ai-pricing:${actor.id}`, 20, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request.", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const [result, market] = await Promise.all([
      completeAiText({
        feature: "pricing",
        system: "You are a resale pricing assistant. Return a cautious price range, confidence, and seller action.",
        prompt: JSON.stringify(parsed.data, null, 2),
        maxTokens: 500
      }),
      getPricingGuidanceForInput(parsed.data.category, parsed.data.targetPriceCents)
    ]);

    return NextResponse.json({ ...result, ...market });
  } catch (error) {
    console.error("[ai:pricing] Provider request failed:", error);
    return NextResponse.json({ error: "AI assistant is temporarily unavailable." }, { status: 502 });
  }
}
