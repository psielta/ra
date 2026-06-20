import { NextResponse } from "next/server";

import { issuePasswordResetToken } from "@/lib/auth/password-reset";
import { sendPasswordResetEmail } from "@/lib/email/password-reset-email";
import { createRequestLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations/password";

const forgotLogger = createRequestLogger({ module: "auth.forgot_password" });

const GENERIC_MESSAGE =
  "Se o email estiver cadastrado, enviamos instruções para redefinir a senha.";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const log = forgotLogger.child({ requestId });

  try {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Dados inválidos",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
      },
    });

    if (user?.passwordHash) {
      const token = await issuePasswordResetToken(user.id);

      try {
        await sendPasswordResetEmail({
          to: user.email,
          name: user.name,
          token,
        });
      } catch (error) {
        log.error({
          event: "auth.forgot_password.email_failed",
          userId: user.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });

        return NextResponse.json(
          { message: "Não foi possível enviar o email. Tente novamente." },
          { status: 503 },
        );
      }

      log.info({ event: "auth.forgot_password.sent", userId: user.id });
    } else {
      log.info({ event: "auth.forgot_password.noop", email });
    }

    return NextResponse.json({ message: GENERIC_MESSAGE });
  } catch (error) {
    log.error({
      event: "auth.forgot_password.error",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
