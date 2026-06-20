"use client";

import { SeriesForm } from "@/components/series/series-form";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type SeriesCreateDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SeriesCreateDrawer({
  open,
  onOpenChange,
}: SeriesCreateDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="border-gold/15 w-full sm:max-w-md">
        <SheetHeader className="border-gold/10 border-b pb-4">
          <SheetTitle className="font-display text-lg tracking-wide">
            Nova série
          </SheetTitle>
          <p className="text-muted-foreground text-sm">
            Crie uma coleção para organizar músicas e vídeos por tema ou
            projeto.
          </p>
        </SheetHeader>
        <div className="px-4 pb-6">
          <SeriesForm
            onCreated={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
