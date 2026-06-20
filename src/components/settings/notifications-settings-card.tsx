"use client";

import { Loader2, Radio } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePublishTestNotification } from "@/hooks/use-notifications";
import { toast } from "sonner";

export function NotificationsSettingsCard() {
  const publishTest = usePublishTestNotification();

  return (
    <Card className="border-gold/15">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2 tracking-wide">
          <Radio className="text-gold size-5" />
          Notificações em tempo real
        </CardTitle>
        <CardDescription>
          Canal SSE conectado ao painel. Alertas aparecem no sino do header e
          como toast quando jobs, uploads e ações do app forem concluídos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Com Redis ativo, múltiplas instâncias da API recebem o mesmo evento
          via pub/sub. Sem Redis, o fallback em memória funciona em
          desenvolvimento local com uma única instância.
        </p>
        <Button
          className="cursor-pointer"
          disabled={publishTest.isPending}
          onClick={() =>
            publishTest.mutate(undefined, {
              onSuccess: () => {
                toast.message("Notificação enviada", {
                  description:
                    "Se o SSE estiver conectado, o toast também chega pelo canal em tempo real.",
                });
              },
              onError: (error) => {
                toast.error("Falha ao enviar notificação", {
                  description: error.message,
                });
              },
            })
          }
        >
          {publishTest.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Radio className="size-4" />
          )}
          Enviar notificação de teste
        </Button>
      </CardContent>
    </Card>
  );
}
