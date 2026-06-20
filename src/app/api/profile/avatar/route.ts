import { NextResponse } from "next/server";

import { requireSession } from "@/lib/api-auth";
import { createRequestLogger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { publishNotification } from "@/lib/realtime/notifications";
import { deleteUserAvatar, uploadUserAvatar } from "@/lib/storage/avatar";
import { toProfileDto } from "@/lib/validations/profile";

const avatarLogger = createRequestLogger({ module: "profile.avatar" });

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const log = avatarLogger.child({ requestId });
  const authResult = await requireSession();

  if (authResult.response) {
    return authResult.response;
  }

  const userId = authResult.session.user.id;

  try {
    const formData = await request.formData();
    const file = formData.get("avatar");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { message: "Envie um arquivo de imagem válido." },
        { status: 400 },
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true },
    });

    const imageUrl = await uploadUserAvatar(userId, file, currentUser?.image);

    const user = await prisma.user.update({
      where: { id: userId },
      data: { image: imageUrl },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
      },
    });

    void publishNotification({
      userId,
      type: "SUCCESS",
      category: "ACCOUNT",
      title: "Foto de perfil atualizada",
      message: "Sua nova foto já está visível no painel.",
    }).catch(() => undefined);

    log.info({ event: "profile.avatar_uploaded", userId });

    return NextResponse.json(toProfileDto(user));
  } catch (error) {
    log.error({
      event: "profile.avatar_upload_error",
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    const message =
      error instanceof Error ? error.message : "Erro interno do servidor";

    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE() {
  const requestId = crypto.randomUUID();
  const log = avatarLogger.child({ requestId });
  const authResult = await requireSession();

  if (authResult.response) {
    return authResult.response;
  }

  const userId = authResult.session.user.id;

  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { image: true },
    });

    await deleteUserAvatar(currentUser?.image);

    const user = await prisma.user.update({
      where: { id: userId },
      data: { image: null },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
      },
    });

    log.info({ event: "profile.avatar_removed", userId });

    return NextResponse.json(toProfileDto(user));
  } catch (error) {
    log.error({
      event: "profile.avatar_delete_error",
      userId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { message: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
