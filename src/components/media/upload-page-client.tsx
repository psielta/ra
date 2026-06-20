"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { MediaUploadForm } from "@/components/media/media-upload-form";

function UploadPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const seriesId = searchParams.get("seriesId") ?? undefined;

  return (
    <MediaUploadForm
      defaultSeriesId={seriesId}
      onSuccess={(mediaAssetId) => {
        router.push(`/resources/${mediaAssetId}`);
      }}
    />
  );
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
