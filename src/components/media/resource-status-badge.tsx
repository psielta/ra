import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ResourceStatus } from "@/lib/validations/series";

const statusConfig: Record<
  ResourceStatus,
  { label: string; className: string; icon: typeof Loader2 }
> = {
  processing: {
    label: "Processando",
    className: "bg-amber-500/15 text-amber-800 border-amber-500/25",
    icon: Loader2,
  },
  ready: {
    label: "Pronto",
    className: "bg-emerald-500/15 text-emerald-800 border-emerald-500/25",
    icon: CheckCircle2,
  },
  error: {
    label: "Erro",
    className: "bg-destructive/10 text-destructive border-destructive/25",
    icon: AlertCircle,
  },
};

export function ResourceStatusBadge({
  status,
  progress,
  className,
}: {
  status: ResourceStatus;
  progress?: number;
  className?: string;
}) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className,
      )}
    >
      <Icon
        className={cn("size-3.5", status === "processing" && "animate-spin")}
      />
      {config.label}
      {status === "processing" && typeof progress === "number" && progress > 0
        ? ` · ${Math.round(progress)}%`
        : null}
    </span>
  );
}
