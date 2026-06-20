"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-8 text-center">
          <h2 className="text-xl font-semibold">Algo deu errado</h2>
          <p className="text-muted-foreground max-w-md text-sm">
            Ocorreu um erro inesperado. Tente novamente ou volte mais tarde.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-md bg-black px-4 py-2 text-sm text-white"
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
