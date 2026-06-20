import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { createRequestLogger } from "@/lib/logger";
import { publishNotificationToAdmins } from "@/lib/realtime/notifications";
import { signUpSchema } from "@/lib/validations/auth";

const registerLogger = createRequestLogger({ module: "register" });

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const log = registerLogger.child({ requestId });

  try {
    const body = await request.json();
    const parsed = signUpSchema.safeParse(body);

    if (!parsed.success) {
      log.warn({
        event: "register.validation_failed",
        errors: parsed.error.flatten(),
      });

      return NextResponse.json(
        {
          message: "Validation failed",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { name, email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      log.warn({
        event: "register.email_exists",
        email: normalizedEmail,
      });

      return NextResponse.json(
        { message: "An account with this email already exists" },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    log.info({
      event: "register.success",
      userId: user.id,
      email: normalizedEmail,
    });

    void publishNotificationToAdmins({
      type: "INFO",
      category: "ACCOUNT",
      title: "Novo usuário registrado",
      message: `${name} (${normalizedEmail}) criou uma conta no Ra.`,
      metadata: { userId: user.id, email: normalizedEmail },
    }).catch((error) => {
      log.warn({
        event: "register.admin_notification_failed",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    });

    return NextResponse.json(
      {
        message: "Account created successfully",
        user,
      },
      { status: 201 },
    );
  } catch (error) {
    log.error({
      event: "register.error",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 },
    );
  }
}
