"use client";

import { Loader2, Star } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useSetResourceFavorite } from "@/hooks/use-resources";
import type { ResourceDto } from "@/lib/validations/series";
import { cn } from "@/lib/utils";

type FavoriteToggleButtonProps = {
  resource: Pick<ResourceDto, "id" | "title" | "isFavorite">;
  className?: string;
  showLabel?: boolean;
  size?: "icon" | "sm";
  variant?: "ghost" | "outline" | "secondary";
};

export function FavoriteToggleButton({
  resource,
  className,
  showLabel = false,
  size = "icon",
  variant = "ghost",
}: FavoriteToggleButtonProps) {
  const [optimisticFavorite, setOptimisticFavorite] = useState<{
    resourceId: string;
    isFavorite: boolean;
  } | null>(null);
  const setFavorite = useSetResourceFavorite(resource.id);
  const isFavorite =
    optimisticFavorite?.resourceId === resource.id
      ? optimisticFavorite.isFavorite
      : resource.isFavorite;
  const title = resource.title ?? "Sem titulo";
  const label = isFavorite
    ? `Remover ${title} dos favoritos`
    : `Adicionar ${title} aos favoritos`;

  async function handleClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (setFavorite.isPending) return;

    const nextFavorite = !isFavorite;
    setOptimisticFavorite({
      resourceId: resource.id,
      isFavorite: nextFavorite,
    });

    try {
      const updated = await setFavorite.mutateAsync(nextFavorite);
      setOptimisticFavorite(null);
      toast.success(
        updated.isFavorite
          ? "Adicionado aos favoritos"
          : "Removido dos favoritos",
      );
    } catch (error) {
      setOptimisticFavorite(null);
      toast.error("Nao foi possivel atualizar favoritos", {
        description:
          error instanceof Error ? error.message : "Tente novamente.",
      });
    }
  }

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      aria-label={label}
      aria-pressed={isFavorite}
      title={label}
      disabled={setFavorite.isPending}
      className={cn(
        isFavorite && "text-gold hover:text-gold",
        size === "icon" && "size-8",
        className,
      )}
      onClick={handleClick}
    >
      {setFavorite.isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Star className={cn("size-4", isFavorite && "fill-current")} />
      )}
      {showLabel ? (isFavorite ? "Favorito" : "Favoritar") : null}
    </Button>
  );
}
