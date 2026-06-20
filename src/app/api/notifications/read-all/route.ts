import { NextResponse } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { createRequestLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const readAllLogger = createRequestLogger({ module: "notifications.read_all" });

export async function POST() {
  const requestId = crypto.randomUUID();
  const log = readAllLogger.child({ requestId });
  const authResult = await requireSession();

  if (authResult.response) {
    return authResult.response;
  }

  const userId = authResult.session.user.id;

  try {
    const result = await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });

    log.info({
      event: "notifications.read_all.ok",
      userId,
      updated: result.count,
    });

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    log.error({
      event: "notifications.read_all.error",
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
