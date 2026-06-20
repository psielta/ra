import { Suspense } from "react";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata = {
  title: "Redefinir senha",
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-svh" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
