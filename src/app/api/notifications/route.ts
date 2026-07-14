import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentActor } from "@/lib/auth";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/server/notifications";

const markReadSchema = z.object({
  notificationId: z.string().optional()
});

export async function POST(request: Request) {
  const actor = await getCurrentActor();
  if (!actor.isAuthenticated) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const parsed = markReadSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (parsed.data.notificationId) {
    await markNotificationRead(actor, parsed.data.notificationId);
  } else {
    await markAllNotificationsRead(actor);
  }

  return NextResponse.json({ ok: true });
}
