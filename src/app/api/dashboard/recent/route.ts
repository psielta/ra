import { NextResponse } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { createRequestLogger } from "@/lib/logger";
import { getRecentResources } from "@/lib/media/recent-resources";

const dashboardLogger = createRequestLogger({ module: "dashboard" });

export async function GET(request: Request) {
  const authResult = await requireSession();
  if (authResult.response) return authResult.response;

  const userId = authResult.session.user.id;
  const { searchParams } = new URL(request.url);
  const limitRaw = searchParams.get("limit");
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;

  if (limit !== undefined && (Number.isNaN(limit) || limit < 1 || limit > 24)) {
    return NextResponse.json(
      { message: "Parâmetro limit inválido" },
      { status: 400 },
    );
  }

  try {
    const items = await getRecentResources(userId, limit);

    dashboardLogger.info({
      event: "dashboard.recent_listed",
      userId,
      count: items.length,
    });

    return NextResponse.json(items);
  } catch (error) {
    dashboardLogger.error({
      event: "dashboard.recent_error",
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
