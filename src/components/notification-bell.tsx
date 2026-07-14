"use client";

import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { NotificationItem } from "@/lib/server/notifications";

interface Props {
  unreadCount: number;
  notifications: NotificationItem[];
}

export function NotificationBell({ unreadCount: initialCount, notifications: initial }: Props) {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialCount);
  const [notifications, setNotifications] = useState(initial);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString(), isUnread: false })));
    setUnreadCount(0);
    router.refresh();
  }

  async function markOneRead(id: string) {
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ notificationId: id })
    });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString(), isUnread: false } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        className="focus-ring relative grid size-8 place-items-center rounded-md border border-[var(--line)] bg-white text-[var(--ink-muted)] hover:text-[var(--ink)]"
      >
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-[18px] place-items-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-bold leading-[18px] text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 overflow-hidden rounded-lg border border-[var(--line)] bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
            <span className="text-sm font-bold">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-[var(--ink-muted)] hover:text-[var(--ink)]"
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-[var(--ink-muted)]">
                No notifications yet.
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationRow key={n.id} notification={n} onRead={markOneRead} />
              ))
            )}
          </div>

          <div className="border-t border-[var(--line)] px-4 py-2">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center gap-1 text-xs text-[var(--ink-muted)] hover:text-[var(--ink)]"
            >
              <ExternalLink size={12} /> View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationRow({
  notification,
  onRead
}: {
  notification: NotificationItem;
  onRead: (id: string) => void;
}) {
  const content = (
    <div
      className={`border-b border-[var(--line)] px-4 py-3 last:border-0 ${notification.isUnread ? "bg-orange-50" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{notification.title}</div>
          <div className="mt-0.5 text-xs leading-5 text-[var(--ink-muted)]">{notification.body}</div>
          <div className="mt-1 text-[10px] text-[var(--ink-muted)]">
            {new Date(notification.createdAt).toLocaleString()}
          </div>
        </div>
        {notification.isUnread && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onRead(notification.id);
            }}
            className="mt-1 shrink-0 text-[var(--ink-muted)] hover:text-[var(--ink)]"
            aria-label="Mark as read"
          >
            <span className="block size-2 rounded-full bg-[var(--accent)]" />
          </button>
        )}
      </div>
    </div>
  );

  if (notification.linkUrl) {
    return (
      <Link href={notification.linkUrl} className="block hover:bg-[var(--background)]">
        {content}
      </Link>
    );
  }

  return <div>{content}</div>;
}
