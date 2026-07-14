import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentActor } from "@/lib/auth";
import { completeAiText } from "@/lib/ai/providers";
import { rateLimit } from "@/lib/rate-limit";
import { can } from "@/lib/rbac";

const requestSchema = z.object({
  title: z.string().min(1).max(140),
  category: z.string().min(1).max(80),
  condition: z.string().min(1).max(80),
  description: z.string().min(1).max(4000)
});

export async function POST(request: Request) {
  const actor = await getCurrentActor();
  if (!can(actor.role, "ai:use")) {
    return NextResponse.json({ error: "AI access requires a member role." }, { status: 403 });
  }

  const limited = rateLimit(`ai-listing:${actor.id}`, 20, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request.", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await completeAiText({
      feature: "listing",
      system: "You are a marketplace listing assistant. Give concise, concrete recommendations for trusted resale listings.",
      prompt: JSON.stringify(parsed.data, null, 2),
      maxTokens: 500
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[ai:listing] Provider request failed:", error);
    return NextResponse.json({ error: "AI assistant is temporarily unavailable." }, { status: 502 });
  }
}
