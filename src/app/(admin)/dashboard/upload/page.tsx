import { Mic, Upload, Video } from "lucide-react";

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

const steps = [
  "Você envia ou grava MP3/MP4",
  "O arquivo vai para o MinIO",
  "Um job entra na fila RabbitMQ",
  "O worker .NET converte com FFmpeg (vídeo → HLS)",
  "O progresso aparece em tempo real via Redis",
  "Status muda para ready — disponível na biblioteca",
];

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl tracking-wide">Enviar mídia</h2>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          Grave ou faça upload de músicas e vídeos para o seu portfolio. O
          processamento é assíncrono: você recebe resposta imediata e acompanha
          a conversão no painel.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-gold/15">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="text-gold size-4" />
              Upload de arquivo
            </CardTitle>
            <CardDescription>MP3 para música · MP4 para vídeo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-input bg-muted/30 flex h-36 flex-col items-center justify-center gap-2 rounded-lg border border-dashed">
              <Upload className="text-muted-foreground size-8 opacity-50" />
              <p className="text-muted-foreground text-sm">
                Área de upload em breve
              </p>
              <p className="text-muted-foreground text-xs">
                Arraste arquivos ou clique para selecionar
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gold/15">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mic className="text-gold size-4" />
              Gravar no navegador
            </CardTitle>
            <CardDescription>Áudio ou vídeo via MediaRecorder</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-input bg-muted/30 flex h-36 flex-col items-center justify-center gap-2 rounded-lg border border-dashed">
              <Video className="text-muted-foreground size-8 opacity-50" />
              <p className="text-muted-foreground text-sm">Gravação em breve</p>
              <p className="text-muted-foreground text-xs">
                Use microfone e câmera do dispositivo
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-gold/15">
        <CardHeader>
          <CardTitle className="text-lg">
            Como funciona o processamento
          </CardTitle>
          <CardDescription>
            Pipeline assíncrono — você não precisa esperar a conversão terminar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="text-muted-foreground space-y-2 text-sm">
            {steps.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="text-gold font-display shrink-0 text-xs tracking-wider">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
