"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentActor } from "@/lib/auth";
import { sendConversationMessage } from "@/lib/server/marketplace";

export async function sendConversationMessageAction(formData: FormData) {
  const actor = await getCurrentActor();
  if (!actor.isAuthenticated) {
    redirect("/sign-in");
  }

  const conversationId = String(formData.get("conversationId") ?? "");
  const body = String(formData.get("body") ?? "");
  const result = await sendConversationMessage(actor, conversationId, body);
  revalidatePath("/messages");

  redirect(`/messages?conversation=${encodeURIComponent(conversationId)}&status=${result.mode}`);
}
