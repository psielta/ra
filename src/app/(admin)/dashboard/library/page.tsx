import { Headphones, Loader2, Video } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Biblioteca",
};

export default function LibraryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl tracking-wide">Biblioteca</h2>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          Suas músicas e vídeos em um só lugar. Cada item mostra o status do
          processamento — <span className="text-foreground">processing</span>,{" "}
          <span className="text-foreground">ready</span> ou{" "}
          <span className="text-foreground">error</span> — e permite reproduzir
          quando estiver pronto.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-gold/15">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Headphones className="text-gold size-4" />
              Músicas (MP3)
            </CardTitle>
            <CardDescription>
              Reprodução direta no player de áudio quando o upload for
              concluído.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Em breve: listagem com TanStack Table, busca, filtros e player
              HTML5.
            </p>
          </CardContent>
        </Card>

        <Card className="border-gold/15">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Video className="text-gold size-4" />
              Vídeos (HLS)
            </CardTitle>
            <CardDescription>
              MP4 convertido para streaming adaptativo (.m3u8 + segmentos).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Em breve: player com hls.js, thumbnail e barra de progresso
              durante a conversão.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-gold/25 bg-muted/20 border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <Loader2 className="text-muted-foreground size-8 opacity-40" />
          <p className="text-muted-foreground max-w-md text-sm">
            Sua biblioteca está vazia. Quando o módulo de upload estiver ativo,
            os arquivos enviados aparecerão aqui com progresso em tempo real até
            ficarem prontos para assistir ou ouvir.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
