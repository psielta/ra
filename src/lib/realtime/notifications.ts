import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { createRequestLogger } from "@/lib/logger";
import type { NotificationDto } from "@/types/notifications";
import type { PublishNotificationInput } from "@/lib/validations/notifications";

import { deliverNotification } from "./notification-bus";

const notificationsLogger = createRequestLogger({ module: "notifications" });

export function toNotificationDto(notification: {
  id: string;
  userId: string;
  type: NotificationDto["type"];
  category: NotificationDto["category"];
  title: string;
  message: string;
  readAt: Date | null;
  metadata: Prisma.JsonValue;
  createdAt: Date;
}): NotificationDto {
  return {
    id: notification.id,
    userId: notification.userId,
    type: notification.type,
    category: notification.category,
    title: notification.title,
    message: notification.message,
    readAt: notification.readAt?.toISOString() ?? null,
    metadata:
      notification.metadata &&
      typeof notification.metadata === "object" &&
      !Array.isArray(notification.metadata)
        ? (notification.metadata as Record<string, unknown>)
        : null,
    createdAt: notification.createdAt.toISOString(),
  };
}

export async function publishNotification(
  input: PublishNotificationInput & { userId: string },
) {
  const notification = await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      category: input.category,
      title: input.title,
      message: input.message,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });

  const dto = toNotificationDto(notification);

  try {
    await deliverNotification(input.userId, dto);
  } catch (error) {
    notificationsLogger.error({
      event: "notifications.deliver_failed",
      userId: input.userId,
      notificationId: notification.id,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  notificationsLogger.info({
    event: "notifications.published",
    userId: input.userId,
    notificationId: notification.id,
    type: input.type,
    category: input.category,
  });

  return dto;
}

export async function publishNotificationToAdmins(
  input: Omit<PublishNotificationInput, "userId">,
) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  if (admins.length === 0) {
    return [];
  }

  return Promise.all(
    admins.map((admin) =>
      publishNotification({
        ...input,
        userId: admin.id,
      }),
    ),
  );
}
