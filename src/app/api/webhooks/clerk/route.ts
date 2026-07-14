import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { closeUserByClerkId, upsertUserFromClerk } from "@/lib/server/users";

interface ClerkWebhookEvent {
  type: string;
  data: {
    id: string;
    email_addresses?: Array<{ email_address: string; id: string }>;
    primary_email_address_id?: string;
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
    public_metadata?: Record<string, unknown>;
  };
}

export async function POST(request: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CLERK_WEBHOOK_SECRET is not configured." }, { status: 501 });
  }

  const payload = await request.text();
  const headerStore = await headers();
  const svixId = headerStore.get("svix-id");
  const svixTimestamp = headerStore.get("svix-timestamp");
  const svixSignature = headerStore.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing Svix headers." }, { status: 400 });
  }

  let event: ClerkWebhookEvent;
  try {
    event = new Webhook(secret).verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature
    }) as ClerkWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  if (event.type === "user.created" || event.type === "user.updated") {
    const email =
      event.data.email_addresses?.find((item) => item.id === event.data.primary_email_address_id)?.email_address ??
      event.data.email_addresses?.[0]?.email_address;

    if (!email) {
      return NextResponse.json({ error: "Clerk user is missing an email address." }, { status: 400 });
    }

    const displayName =
      [event.data.first_name, event.data.last_name].filter(Boolean).join(" ").trim() ||
      event.data.username ||
      email.split("@")[0];

    const user = await upsertUserFromClerk({
      clerkId: event.data.id,
      email,
      displayName,
      handle: event.data.username,
      role: event.data.public_metadata?.role ?? "BUYER"
    });

    return NextResponse.json({
      ok: true,
      action: "user.upserted",
      clerkId: event.data.id,
      userId: user.id,
      role: user.role
    });
  }

  if (event.type === "user.deleted") {
    await closeUserByClerkId(event.data.id);
    return NextResponse.json({ ok: true, action: "user.closed", clerkId: event.data.id });
  }

  return NextResponse.json({ ok: true, ignored: event.type });
}
