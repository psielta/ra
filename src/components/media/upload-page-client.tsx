"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { MediaUploadForm } from "@/components/media/media-upload-form";

function UploadPageInner() {
  const searchParams = useSearchParams();
  const seriesId = searchParams.get("seriesId") ?? undefined;

  return <MediaUploadForm defaultSeriesId={seriesId} />;
}

export function UploadPageClient() {
  return (
    <Suspense
      fallback={<p className="text-muted-foreground text-sm">Carregando...</p>}
    >
      <UploadPageInner />
    </Suspense>
  );
}
