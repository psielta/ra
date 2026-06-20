import { NextResponse } from "next/server";

import { auth } from "@/auth";

export async function requireSession() {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      session: null,
      response: NextResponse.json(
        { message: "Não autorizado" },
        { status: 401 },
      ),
    } as const;
  }

  return {
    session,
    response: null,
  } as const;
}
