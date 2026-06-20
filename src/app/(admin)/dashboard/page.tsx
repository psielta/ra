import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Library, Radio, Upload, Video } from "lucide-react";
import Link from "next/link";

import { auth } from "@/auth";
import { RecentFeed } from "@/components/dashboard/recent-feed";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Inicio",
};

export default async function DashboardPage() {
  const session = await auth();
  const user = session?.user;
  const today = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", {
    locale: ptBR,
  });

  return (
    <div className="space-y-8">
      <div className="border-gold/20 from-lapis/10 via-background to-gold/5 relative overflow-hidden rounded-xl border bg-gradient-to-br p-6 sm:p-8">
        <div className="sun-disk pointer-events-none absolute -top-8 -right-8 size-32 opacity-30" />
        <div className="relative space-y-4">
          <p className="text-muted-foreground text-sm tracking-widest uppercase">
            {today}
          </p>
          <h2 className="font-display text-2xl tracking-wide sm:text-3xl">
            Ola, {user?.name ?? "artista"}
          </h2>
          <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
            Este e o seu espaco para gravar e enviar musicas (MP3) e videos
            (MP4), acompanhar a conversao em tempo real e assistir tudo na sua
            biblioteca pessoal. MP3 e MP4 sao preparados para streaming HLS.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild className="bg-lapis hover:bg-lapis/90 text-papyrus">
              <Link href="/dashboard/upload">
                <Upload className="size-4" />
                Enviar midia
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-gold/25">
              <Link href="/dashboard/library">
                <Library className="size-4" />
                Ver biblioteca
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <RecentFeed />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-gold/15">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Upload className="size-3.5" />
              Upload e gravacao
            </CardDescription>
            <CardTitle className="text-lg">Envio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Envie MP3/MP4 ou grave pelo navegador. Cada arquivo inicia um job
              de processamento com status rastreavel.
            </p>
          </CardContent>
        </Card>

        <Card className="border-gold/15">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Video className="size-3.5" />
              Conversao HLS
            </CardDescription>
            <CardTitle className="text-lg">MP3/MP4 para HLS</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Audios e videos convertidos por FFmpeg no worker .NET. Voce
              acompanha o progresso ao vivo enquanto os segmentos HLS sao
              gerados.
            </p>
          </CardContent>
        </Card>

        <Card className="border-gold/15 sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Radio className="size-3.5" />
              Players
            </CardDescription>
            <CardTitle className="text-lg">hls.js</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Quando o status for{" "}
              <code className="text-gold text-xs">ready</code>, reproduza audio
              e video via HLS no player integrado da biblioteca.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
