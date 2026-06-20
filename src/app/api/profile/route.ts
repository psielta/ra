import { NextResponse } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { createRequestLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { toProfileDto, updateProfileSchema } from "@/lib/validations/profile";

const profileLogger = createRequestLogger({ module: "profile" });

export async function GET() {
  const authResult = await requireSession();

  if (authResult.response) {
    return authResult.response;
  }

  const userId = authResult.session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { message: "Usuário não encontrado" },
      { status: 404 },
    );
  }

  return NextResponse.json(toProfileDto(user));
}

export async function PATCH(request: Request) {
  const requestId = crypto.randomUUID();
  const log = profileLogger.child({ requestId });
  const authResult = await requireSession();

  if (authResult.response) {
    return authResult.response;
  }

  const userId = authResult.session.user.id;

  try {
    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Dados inválidos",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { name: parsed.data.name },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
      },
    });

    log.info({ event: "profile.updated", userId });

    return NextResponse.json(toProfileDto(user));
  } catch (error) {
    log.error({
      event: "profile.update_error",
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
