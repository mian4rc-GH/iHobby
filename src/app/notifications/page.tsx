import { Bell } from "lucide-react";
import { AccessPanel } from "@/components/access-panel";
import { SiteShell } from "@/components/site-shell";
import { Badge, Card, LinkButton } from "@/components/ui";
import { getCurrentActor } from "@/lib/auth";
import { getNotificationsForActor } from "@/lib/server/notifications";

export default async function NotificationsPage() {
  const actor = await getCurrentActor();

  if (!actor.isAuthenticated) {
    return (
      <SiteShell>
        <AccessPanel title="Sign in to view notifications" />
      </SiteShell>
    );
  }

  const notifications = await getNotificationsForActor(actor);

  return (
    <SiteShell>
      <div className="grid gap-5">
        <div>
          <Badge tone="info">Notifications</Badge>
          <h1 className="mt-3 text-3xl font-bold">Notification center</h1>
          <p className="mt-2 text-sm text-[var(--ink-muted)]">
            {notifications.unreadCount} unread updates for {actor.displayName}.
          </p>
        </div>

        <Card className="overflow-hidden">
          {notifications.items.length === 0 ? (
            <div className="grid place-items-center gap-3 p-8 text-center text-sm text-[var(--ink-muted)]">
              <Bell size={22} />
              No notifications yet.
            </div>
          ) : (
            <div className="divide-y divide-[var(--line)]">
              {notifications.items.map((notification) => (
                <div key={notification.id} className={notification.isUnread ? "bg-orange-50 p-4" : "p-4"}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-bold">{notification.title}</h2>
                        {notification.isUnread ? <Badge tone="warn">Unread</Badge> : <Badge>Read</Badge>}
                      </div>
                      <p className="mt-2 text-sm text-[var(--ink-muted)]">{notification.body}</p>
                      <p className="mt-2 text-xs text-[var(--ink-muted)]">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {notification.linkUrl ? (
                      <LinkButton href={notification.linkUrl} size="sm">
                        Open
                      </LinkButton>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </SiteShell>
  );
}
