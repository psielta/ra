import { UploadDrawerTrigger } from "@/components/media/upload-drawer-trigger";
import { ResourcesBrowser } from "@/components/media/resources-browser";

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
        <UploadDrawerTrigger>Enviar mídia</UploadDrawerTrigger>
      </div>

      <ResourcesBrowser />
    </div>
  );
}
