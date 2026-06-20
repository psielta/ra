"use client";

import { SeriesEditForm } from "@/components/series/series-edit-form";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { SeriesDto } from "@/lib/validations/series";

type SeriesEditDrawerProps = {
  series: SeriesDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SeriesEditDrawer({
  series,
  open,
  onOpenChange,
}: SeriesEditDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="border-gold/15 w-full sm:max-w-md">
        <SheetHeader className="border-gold/10 border-b pb-4">
          <SheetTitle className="font-display text-lg tracking-wide">
            Editar série
          </SheetTitle>
          <p className="text-muted-foreground text-sm">
            Atualize título e descrição. O slug permanece o mesmo após salvar.
          </p>
        </SheetHeader>
        <div className="px-4 pb-6">
          <SeriesEditForm
            series={series}
            onSuccess={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
