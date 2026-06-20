import { cn } from "@/lib/utils";

interface RaLogoProps {
  className?: string;
  showTagline?: boolean;
  size?: "sm" | "md" | "lg";
  /** light = sobre fundo escuro (lapis); dark = sobre fundo claro */
  variant?: "light" | "dark";
}

const sizeMap = {
  sm: { disk: "size-8", title: "text-lg", tagline: "text-xs" },
  md: { disk: "size-10", title: "text-xl", tagline: "text-xs" },
  lg: { disk: "size-14", title: "text-3xl", tagline: "text-sm" },
};

export function RaLogo({
  className,
  showTagline = false,
  size = "md",
  variant = "dark",
}: RaLogoProps) {
  const sizes = sizeMap[size];
  const isLight = variant === "light";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "sun-disk relative flex shrink-0 items-center justify-center rounded-full shadow-md ring-2",
          isLight ? "ring-gold/50" : "ring-gold/40",
          sizes.disk,
        )}
        aria-hidden="true"
      >
        <span
          className={cn(
            "font-display text-sm font-bold",
            isLight ? "text-lapis" : "text-primary-foreground/90",
          )}
        >
          ☀
        </span>
      </div>
      <div className="flex flex-col">
        <span
          className={cn(
            "font-display tracking-[0.2em] uppercase",
            isLight ? "text-papyrus" : "text-foreground",
            sizes.title,
          )}
        >
          Ra
        </span>
        {showTagline && (
          <span
            className={cn(
              isLight ? "text-papyrus/75" : "text-muted-foreground",
              sizes.tagline,
            )}
          >
            Portfolio de Mídia
          </span>
        )}
      </div>
    </div>
  );
}
