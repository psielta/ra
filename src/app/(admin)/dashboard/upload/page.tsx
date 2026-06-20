import { UploadPageClient } from "@/components/media/upload-page-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Enviar mídia",
};

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl tracking-wide">Enviar mídia</h2>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          Faça upload de MP3 ou MP4. O arquivo vai para o MinIO, um job entra na
          fila RabbitMQ e o status aparece em Recursos e na série escolhida.
        </p>
      </div>

      <Card className="border-gold/15">
        <CardHeader>
          <CardTitle className="text-lg">Upload de arquivo</CardTitle>
          <CardDescription>MP3 para música · MP4 para vídeo</CardDescription>
        </CardHeader>
        <CardContent>
          <UploadPageClient />
        </CardContent>
      </Card>
    </div>
  );
}
