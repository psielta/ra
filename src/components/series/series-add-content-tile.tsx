import { Plus } from "lucide-react";
import Link from "next/link";

export function SeriesAddContentTile({ seriesId }: { seriesId: string }) {
  return (
    <Link
      href={`/dashboard/upload?seriesId=${seriesId}`}
      className="group w-36 shrink-0"
    >
      <div className="border-gold/20 bg-muted/15 group-hover:border-gold/40 group-hover:bg-gold/5 flex aspect-[3/4] flex-col items-center justify-center gap-2 rounded-lg border border-dashed transition-colors">
        <Plus className="text-gold size-8" />
      </div>
      <p className="group-hover:text-gold mt-2 text-sm font-medium transition-colors">
        Enviar mídia
      </p>
      <p className="text-muted-foreground text-xs">Adicionar à série</p>
    </Link>
  );
}
