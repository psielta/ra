import { Music, Upload, Video } from "lucide-react";

import { RaLogo } from "@/components/brand/ra-logo";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

const features = [
  {
    icon: Upload,
    label: "Envie MP3 e MP4",
    description: "Upload ou gravacao direto no navegador",
  },
  {
    icon: Video,
    label: "Streaming HLS",
    description: "MP3 e MP4 convertidos para assistir em qualquer tela",
  },
  {
    icon: Music,
    label: "Sua biblioteca",
    description: "Organize e reproduza suas musicas e videos",
  },
];

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="bg-background egyptian-pattern relative flex min-h-svh">
      <div className="from-lapis/20 to-gold/10 pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent" />

      <div className="border-gold/20 bg-lapis text-papyrus relative hidden w-1/2 flex-col justify-between border-r p-12 lg:flex">
        <RaLogo size="lg" showTagline variant="light" />

        <div className="space-y-8">
          <div className="space-y-4">
            <h2 className="font-display text-papyrus text-2xl leading-tight tracking-wide">
              Seu portfolio de musica e video
            </h2>
            <p className="text-papyrus/80 max-w-md text-sm leading-relaxed">
              Grave, envie e assista ao seu proprio conteudo. MP3 e MP4 sao
              convertidos para streaming HLS; o progresso da conversao aparece
              em tempo real no painel.
            </p>
          </div>

          <ul className="space-y-4">
            {features.map((feature) => (
              <li key={feature.label} className="flex items-start gap-3">
                <span className="bg-gold/15 ring-gold/30 mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md ring-1">
                  <feature.icon className="text-gold size-4" />
                </span>
                <div>
                  <p className="text-papyrus text-sm font-medium">
                    {feature.label}
                  </p>
                  <p className="text-papyrus/65 text-xs">
                    {feature.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="text-papyrus/50 flex items-center gap-3 text-xs tracking-widest uppercase">
          <span className="bg-gold/40 h-px w-8" />
          <span>MP3 - MP4 - HLS</span>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2 text-center lg:text-left">
            <div className="mb-8 flex justify-center lg:hidden">
              <RaLogo size="md" showTagline />
            </div>
            <h1 className="font-display text-foreground text-2xl tracking-wide">
              {title}
            </h1>
            <p className="text-muted-foreground text-sm">{subtitle}</p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
