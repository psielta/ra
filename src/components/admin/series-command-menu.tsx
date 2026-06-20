"use client";

import { Folder, Layers, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { useSeriesList } from "@/hooks/use-series";

type SeriesCommandMenuContextValue = {
  setOpen: (open: boolean) => void;
};

const SeriesCommandMenuContext =
  createContext<SeriesCommandMenuContextValue | null>(null);

function useSeriesCommandMenu() {
  const context = useContext(SeriesCommandMenuContext);
  if (!context) {
    throw new Error(
      "SeriesCommandTrigger must be used within SeriesCommandMenuProvider",
    );
  }
  return context;
}

function useIsMac() {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad|iPod/.test(navigator.userAgent));
  }, []);

  return isMac;
}

export function SeriesCommandMenuProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data: seriesList = [], isLoading } = useSeriesList();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k") return;
      if (!(event.metaKey || event.ctrlKey)) return;

      event.preventDefault();
      setOpen((current) => !current);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  return (
    <SeriesCommandMenuContext.Provider value={{ setOpen }}>
      {children}

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Ir para série"
        description="Busque e navegue entre suas coleções de mídia"
        className="border-gold/15 sm:max-w-lg"
      >
        <CommandInput placeholder="Buscar série..." />
        <CommandList>
          <CommandEmpty>Nenhuma série encontrada.</CommandEmpty>

          <CommandGroup heading="Navegação">
            <CommandItem
              value="todas as series colecoes"
              onSelect={() => navigate("/series")}
            >
              <Layers />
              <span>Todas as séries</span>
            </CommandItem>
          </CommandGroup>

          <CommandGroup heading="Coleções">
            {isLoading ? (
              <CommandItem disabled value="carregando">
                <Loader2 className="animate-spin" />
                <span>Carregando séries...</span>
              </CommandItem>
            ) : (
              seriesList.map((series) => (
                <CommandItem
                  key={series.id}
                  value={`${series.title} ${series.slug}`}
                  onSelect={() => navigate(`/series/${series.id}`)}
                >
                  <Folder />
                  <span className="truncate">{series.title}</span>
                  <CommandShortcut>
                    {series.resourceCount}{" "}
                    {series.resourceCount === 1 ? "item" : "itens"}
                  </CommandShortcut>
                </CommandItem>
              ))
            )}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </SeriesCommandMenuContext.Provider>
  );
}

export function SeriesCommandTrigger() {
  const { setOpen } = useSeriesCommandMenu();
  const isMac = useIsMac();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="border-gold/20 text-muted-foreground hover:text-foreground hidden h-8 gap-2 px-2.5 sm:inline-flex"
      onClick={() => setOpen(true)}
      aria-label="Buscar série"
    >
      <Search className="size-4" />
      <span className="hidden md:inline">Séries</span>
      <kbd className="bg-muted text-muted-foreground pointer-events-none hidden h-5 items-center rounded border px-1.5 font-mono text-[10px] font-medium select-none lg:inline-flex">
        {isMac ? "⌘" : "Ctrl"}K
      </kbd>
    </Button>
  );
}
