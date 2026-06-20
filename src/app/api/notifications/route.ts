import { NextResponse } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { createRequestLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { toNotificationDto } from "@/lib/realtime/notifications";
import { notificationListQuerySchema } from "@/lib/validations/notifications";

const listLogger = createRequestLogger({ module: "notifications.list" });

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  const log = listLogger.child({ requestId });
  const authResult = await requireSession();

  if (authResult.response) {
    return authResult.response;
  }

  const userId = authResult.session.user.id;
  const { searchParams } = new URL(request.url);
  const parsed = notificationListQuerySchema.safeParse({
    limit: searchParams.get("limit") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
    unreadOnly: searchParams.get("unreadOnly") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Parâmetros inválidos", errors: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { limit, cursor, unreadOnly } = parsed.data;

  try {
    const [items, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: {
          userId,
          ...(unreadOnly ? { readAt: null } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit + 1,
        ...(cursor
          ? {
              cursor: { id: cursor },
              skip: 1,
            }
          : {}),
      }),
      prisma.notification.count({
        where: { userId, readAt: null },
      }),
    ]);

    const hasMore = items.length > limit;
    const pageItems = hasMore ? items.slice(0, limit) : items;

    log.info({
      event: "notifications.list.ok",
      userId,
      count: pageItems.length,
      unreadCount,
    });

    return NextResponse.json({
      items: pageItems.map(toNotificationDto),
      unreadCount,
      nextCursor: hasMore
        ? (pageItems[pageItems.length - 1]?.id ?? null)
        : null,
    });
  } catch (error) {
    log.error({
      event: "notifications.list.error",
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
