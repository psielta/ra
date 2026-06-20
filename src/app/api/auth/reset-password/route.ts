import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { consumePasswordResetToken } from "@/lib/auth/password-reset";
import { createRequestLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validations/password";

const resetLogger = createRequestLogger({ module: "auth.reset_password" });

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const log = resetLogger.child({ requestId });

  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Dados inválidos",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const user = await consumePasswordResetToken(parsed.data.token);

    if (!user) {
      return NextResponse.json(
        { message: "Link inválido ou expirado. Solicite um novo email." },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    log.info({ event: "auth.reset_password.success", userId: user.id });

    return NextResponse.json({
      message: "Senha redefinida com sucesso. Você já pode entrar.",
    });
  } catch (error) {
    log.error({
      event: "auth.reset_password.error",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
