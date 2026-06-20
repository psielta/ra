import NextAuth from "next-auth";
import type { NextFetchEvent, NextMiddleware, NextRequest } from "next/server";

import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

type AuthProxyMiddleware = (
  request: NextRequest & { auth: unknown },
  event: NextFetchEvent,
) => ReturnType<NextMiddleware>;

const keepSessionAlive: AuthProxyMiddleware = () => undefined;
const authProxy = auth(keepSessionAlive);

export function proxy(request: NextRequest, event: NextFetchEvent) {
  return authProxy(request, event);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/resources/:path*",
    "/series/:path*",
    "/queue/:path*",
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/reset-password",
  ],
};
