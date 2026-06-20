import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Configurações",
};

export default function SettingsPage() {
  return (
    <Card className="border-gold/15">
      <CardHeader>
        <CardTitle className="font-display tracking-wide">
          Configurações
        </CardTitle>
        <CardDescription>
          Perfil, preferências de playback e visibilidade do portfolio.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Em breve: editar nome e avatar, qualidade padrão de upload,
          notificações quando um vídeo terminar de converter e opção de
          portfolio público para visitantes.
        </p>
      </CardContent>
    </Card>
  );
}
