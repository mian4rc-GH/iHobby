import { MessageSquare, Send } from "lucide-react";
import Link from "next/link";
import { sendConversationMessageAction } from "@/app/messages/actions";
import { AccessPanel } from "@/components/access-panel";
import { SiteShell } from "@/components/site-shell";
import { Badge, Button, Card, Input } from "@/components/ui";
import { getCurrentActor } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { listConversationsForActor } from "@/lib/server/marketplace";

export default async function MessagesPage({
  searchParams
}: {
  searchParams: Promise<{ conversation?: string; status?: string }>;
}) {
  const actor = await getCurrentActor();
  const { conversation: selectedConversationId, status } = await searchParams;

  if (!can(actor.role, "message:create")) {
    return (
      <SiteShell>
        <AccessPanel title="Member access required" />
      </SiteShell>
    );
  }

  const conversations = await listConversationsForActor(actor);
  const active = conversations.find((conversation) => conversation.id === selectedConversationId) ?? conversations[0];

  return (
    <SiteShell>
      <div className="page-head">
        <div>
          <Badge tone="info">Messages</Badge>
          <h1 className="page-title mt-3">Messages</h1>
          <div className="page-sub">Buyer and seller conversations tied to RC listings and moderation audit.</div>
        </div>
      </div>
      {status ? <StatusMessage status={status} /> : null}

      <div className="chat-shell">
        <aside className="chat-list">
          {conversations.map((conversation) => (
            <Link
              key={conversation.id}
              href={`/messages?conversation=${conversation.id}`}
              className={conversation.id === active?.id ? "chat-item active focus-ring" : "chat-item focus-ring"}
            >
              <div className="grid size-8 place-items-center rounded-md bg-[var(--bg-2)] text-[var(--teal)]">
                <MessageSquare size={16} />
              </div>
              <div className="min-w-0">
                <div className="font-bold">{conversation.otherParty}</div>
                <div className="truncate text-xs text-[var(--ink-muted)]">{conversation.subject}</div>
              </div>
              <span className="mono ml-auto text-[10px] text-[var(--ink-4)]">{conversation.updatedAt}</span>
            </Link>
          ))}
          {conversations.length === 0 ? (
            <div className="p-4 text-sm text-[var(--ink-muted)]">No persisted conversations yet.</div>
          ) : null}
        </aside>

        <section className="chat-main">
          <div className="chat-head">
            <MessageSquare size={18} />
            <div>
              <div className="font-bold">{active?.subject ?? "No conversation selected"}</div>
              <div className="text-xs text-[var(--ink-muted)]">{active?.listingTitle ?? "Start from a listing detail page."}</div>
            </div>
          </div>
          <div className="chat-body">
            {active?.messages.length ? (
              active.messages.map((message) => (
                <div key={message.id} className={message.isMine ? "msg me" : message.senderRole === "ADMIN" ? "msg ai" : "msg them"}>
                  <div className="mb-1 text-[10px] font-bold uppercase opacity-70">
                    {message.senderName} - {message.sentAt}
                  </div>
                  {message.body}
                </div>
              ))
            ) : active ? (
              <div className="msg ai">No messages have been saved in this conversation yet.</div>
            ) : (
              <div className="msg ai">No persisted conversations yet.</div>
            )}
          </div>
          <form action={sendConversationMessageAction} className="chat-compose">
            <input type="hidden" name="conversationId" value={active?.id ?? ""} />
            <Input className="flex-1" name="body" placeholder="Write a message" disabled={!active} />
            <Button variant="primary" disabled={!active}>
              <Send size={16} /> Send
            </Button>
          </form>
        </section>
      </div>
    </SiteShell>
  );
}

function StatusMessage({ status }: { status: string }) {
  const copy: Record<string, string> = {
    created: "Message sent.",
    invalid: "Write a message before sending.",
    forbidden: "You do not have access to this conversation.",
    missing: "Conversation no longer exists.",
    error: "Message could not be saved."
  };

  return <Card className="mb-4 border-[var(--accent)] bg-orange-50 p-4 text-sm font-semibold text-[var(--accent-strong)]">{copy[status] ?? "Message status updated."}</Card>;
}
