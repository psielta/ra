import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NotificationsSettingsCard } from "@/components/settings/notifications-settings-card";

export const metadata = {
  title: "Configurações",
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <NotificationsSettingsCard />

      <Card className="border-gold/15">
        <CardHeader>
          <CardTitle className="font-display tracking-wide">
            Perfil e portfolio
          </CardTitle>
          <CardDescription>
            Preferências de playback e visibilidade pública do portfolio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Em breve: editar nome e avatar, qualidade padrão de upload e opção
            de portfolio público para visitantes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
