import Link from "next/link";
import { Upload } from "lucide-react";

import { ResourcesBrowser } from "@/components/media/resources-browser";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Recursos",
};

export default function ResourcesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl tracking-wide">Recursos</h2>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            Suas músicas e vídeos. Filtre por tipo ou série e acompanhe o status
            de processamento até ficarem prontos para reprodução.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/upload">
            <Upload className="size-4" />
            Enviar mídia
          </Link>
        </Button>
      </div>

      <ResourcesBrowser />
    </div>
  );
}
