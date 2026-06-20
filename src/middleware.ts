import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

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
