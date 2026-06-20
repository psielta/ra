import Link from "next/link";
import { Upload } from "lucide-react";

import { QueueList } from "@/components/queue/queue-list";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Fila",
};

export default function QueuePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl tracking-wide">
            Fila de processamento
          </h2>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            Mídias aguardando conversão no worker .NET. A lista atualiza
            automaticamente enquanto houver jobs em andamento.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/upload">
            <Upload className="size-4" />
            Enviar mídia
          </Link>
        </Button>
      </div>

      <QueueList />
    </div>
  );
}
