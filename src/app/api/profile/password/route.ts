import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { createRequestLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { publishNotification } from "@/lib/realtime/notifications";
import { changePasswordSchema } from "@/lib/validations/password";

const passwordLogger = createRequestLogger({ module: "profile.password" });

export async function PATCH(request: Request) {
  const requestId = crypto.randomUUID();
  const log = passwordLogger.child({ requestId });
  const authResult = await requireSession();

  if (authResult.response) {
    return authResult.response;
  }

  const userId = authResult.session.user.id;

  try {
    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Dados inválidos",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user?.passwordHash) {
      return NextResponse.json(
        { message: "Conta sem senha local configurada." },
        { status: 400 },
      );
    }

    const isValid = await bcrypt.compare(
      parsed.data.currentPassword,
      user.passwordHash,
    );

    if (!isValid) {
      return NextResponse.json(
        { message: "Senha atual incorreta." },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    void publishNotification({
      userId,
      type: "SUCCESS",
      category: "ACCOUNT",
      title: "Senha alterada",
      message: "Sua senha foi atualizada com sucesso.",
    }).catch(() => undefined);

    log.info({ event: "profile.password_changed", userId });

    return NextResponse.json({ message: "Senha alterada com sucesso." });
  } catch (error) {
    log.error({
      event: "profile.password_change_error",
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
