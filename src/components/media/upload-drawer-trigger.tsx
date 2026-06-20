"use client";

import { Upload } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/ui-store";

type UploadDrawerTriggerProps = {
  children?: ReactNode;
  className?: string;
  defaultSeriesId?: string;
  size?: ComponentProps<typeof Button>["size"];
  variant?: ComponentProps<typeof Button>["variant"];
};

export function UploadDrawerTrigger({
  children = "Enviar midia",
  className,
  defaultSeriesId,
  size,
  variant,
}: UploadDrawerTriggerProps) {
  const openUploadDrawer = useUiStore((state) => state.openUploadDrawer);

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={className}
      onClick={() => openUploadDrawer(defaultSeriesId)}
    >
      <Upload className="size-4" />
      {children}
    </Button>
  );
}
