import { NextResponse } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { createRequestLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { toNotificationDto } from "@/lib/realtime/notifications";

const readLogger = createRequestLogger({ module: "notifications.read" });

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = crypto.randomUUID();
  const log = readLogger.child({ requestId });
  const authResult = await requireSession();

  if (authResult.response) {
    return authResult.response;
  }

  const userId = authResult.session.user.id;
  const { id } = await context.params;

  try {
    const existing = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Notificação não encontrada" },
        { status: 404 },
      );
    }

    const notification = await prisma.notification.update({
      where: { id },
      data: { readAt: existing.readAt ?? new Date() },
    });

    log.info({
      event: "notifications.read.ok",
      userId,
      notificationId: id,
    });

    return NextResponse.json(toNotificationDto(notification));
  } catch (error) {
    log.error({
      event: "notifications.read.error",
      userId,
      notificationId: id,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
