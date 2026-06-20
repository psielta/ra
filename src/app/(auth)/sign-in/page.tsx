import { Suspense } from "react";

import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata = {
  title: "Entrar",
};

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-svh" />}>
      <SignInForm />
    </Suspense>
  );
}
