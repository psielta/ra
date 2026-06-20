import { NextResponse } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { createRequestLogger } from "@/lib/logger";
import { publishNotification } from "@/lib/realtime/notifications";
import { publishNotificationSchema } from "@/lib/validations/notifications";

const publishLogger = createRequestLogger({ module: "notifications.publish" });

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const log = publishLogger.child({ requestId });
  const authResult = await requireSession();

  if (authResult.response) {
    return authResult.response;
  }

  const sessionUserId = authResult.session.user.id;
  const isAdmin = authResult.session.user.role === "ADMIN";

  try {
    const body = await request.json();
    const parsed = publishNotificationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Dados inválidos", errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const targetUserId = parsed.data.userId ?? sessionUserId;

    if (targetUserId !== sessionUserId && !isAdmin) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 403 });
    }

    const notification = await publishNotification({
      ...parsed.data,
      userId: targetUserId,
    });

    log.info({
      event: "notifications.publish.ok",
      actorUserId: sessionUserId,
      targetUserId,
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    log.error({
      event: "notifications.publish.error",
      userId: sessionUserId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
