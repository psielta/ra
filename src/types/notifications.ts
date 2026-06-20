import type { NotificationCategory, NotificationType } from "@prisma/client";

export type NotificationDto = {
  id: string;
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  readAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type NotificationListResponse = {
  items: NotificationDto[];
  unreadCount: number;
  nextCursor: string | null;
};

export type RealtimeSseEvent =
  | { event: "connected"; data: { userId: string } }
  | { event: "notification"; data: NotificationDto }
  | { event: "ping"; data: { ts: number } };
