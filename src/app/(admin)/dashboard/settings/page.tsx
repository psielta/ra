import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NotificationsSettingsCard } from "@/components/settings/notifications-settings-card";
import { ProfileSettingsCard } from "@/components/settings/profile-settings-card";

export const metadata = {
  title: "Configurações",
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <ProfileSettingsCard />
      <NotificationsSettingsCard />

      <Card className="border-gold/15">
        <CardHeader>
          <CardTitle className="font-display tracking-wide">
            Portfolio público
          </CardTitle>
          <CardDescription>
            Preferências de playback e visibilidade pública do portfolio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Em breve: qualidade padrão de upload e opção de portfolio público
            para visitantes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
