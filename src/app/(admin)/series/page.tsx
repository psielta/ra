import { SeriesForm } from "@/components/series/series-form";
import { SeriesList } from "@/components/series/series-list";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Séries",
};

export default function SeriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl tracking-wide">Séries</h2>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          Organize músicas e vídeos em categorias — coletâneas, projetos,
          playlists temáticas ou qualquer agrupamento que fizer sentido.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
        <Card className="border-gold/15 h-fit xl:sticky xl:top-6">
          <CardHeader>
            <CardTitle className="text-lg">Nova série</CardTitle>
            <CardDescription>
              Crie uma categoria e envie mídias direto em cada coleção.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SeriesForm />
          </CardContent>
        </Card>

        <SeriesList />
      </div>
    </div>
  );
}
