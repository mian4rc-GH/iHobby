"use server";

import { prisma } from "@/lib/prisma";
import type { Actor } from "@/types/domain";

export type NotificationKind =
  | "bid_outbid"
  | "bid_winning"
  | "offer_received"
  | "offer_accepted"
  | "offer_declined"
  | "offer_withdrawn"
  | "listing_approved"
  | "listing_rejected"
  | "listing_sold"
  | "seller_approved"
  | "seller_rejected"
  | "seller_review_received"
  | "message_received";

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  linkUrl: string | null;
  readAt: string | null;
  createdAt: string;
  isUnread: boolean;
}

export interface NotificationSummary {
  items: NotificationItem[];
  unreadCount: number;
}

export async function createNotification(params: {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  linkUrl?: string;
}): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: params.userId,
        kind: params.kind,
        title: params.title,
        body: params.body,
        linkUrl: params.linkUrl ?? null
      }
    });
  } catch (err) {
    console.error("[notifications] Failed to create notification:", err);
  }
}

export async function getNotificationsForActor(actor: Actor): Promise<NotificationSummary> {
  if (!actor.isAuthenticated || actor.role === "VISITOR") {
    return { items: [], unreadCount: 0 };
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: actor.email } });
    if (!user) return { items: [], unreadCount: 0 };

    const rows = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30
    });

    const items: NotificationItem[] = rows.map((row: { id: string; kind: string; title: string; body: string; linkUrl: string | null; readAt: Date | null; createdAt: Date }) => ({
      id: row.id,
      kind: row.kind as NotificationKind,
      title: row.title,
      body: row.body,
      linkUrl: row.linkUrl,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      isUnread: row.readAt === null
    }));

    return {
      items,
      unreadCount: items.filter((n) => n.isUnread).length
    };
  } catch {
    return { items: [], unreadCount: 0 };
  }
}

export async function markNotificationRead(actor: Actor, notificationId: string): Promise<void> {
  if (!actor.isAuthenticated) return;

  try {
    const user = await prisma.user.findUnique({ where: { email: actor.email } });
    if (!user) return;

    await prisma.notification.updateMany({
      where: { id: notificationId, userId: user.id },
      data: { readAt: new Date() }
    });
  } catch (err) {
    console.error("[notifications] Failed to mark read:", err);
  }
}

export async function markAllNotificationsRead(actor: Actor): Promise<void> {
  if (!actor.isAuthenticated) return;

  try {
    const user = await prisma.user.findUnique({ where: { email: actor.email } });
    if (!user) return;

    await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() }
    });
  } catch (err) {
    console.error("[notifications] Failed to mark all read:", err);
  }
}

export async function getUnreadCountForUser(userId: string): Promise<number> {
  try {
    return await prisma.notification.count({ where: { userId, readAt: null } });
  } catch {
    return 0;
  }
}
