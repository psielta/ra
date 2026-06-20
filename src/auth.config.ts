import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/sign-in",
    newUser: "/sign-up",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      const isPublicAuthRoute =
        pathname.startsWith("/sign-in") ||
        pathname.startsWith("/sign-up") ||
        pathname.startsWith("/forgot-password") ||
        pathname.startsWith("/reset-password");

      const isAuthRoute = isPublicAuthRoute;
      const isProtectedRoute =
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/admin") ||
        pathname.startsWith("/resources") ||
        pathname.startsWith("/series") ||
        pathname.startsWith("/queue");

      if (isProtectedRoute) {
        return isLoggedIn;
      }

      if (isAuthRoute && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }

      return true;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
