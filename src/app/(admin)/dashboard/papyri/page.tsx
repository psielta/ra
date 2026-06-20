import { LexicalEditor } from "@/components/editor/lexical-editor";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Papiros",
};

export default function PapyriPage() {
  return (
    <Card className="border-gold/15">
      <CardHeader>
        <CardTitle className="font-display tracking-wide">Papiros</CardTitle>
        <CardDescription>
          Editor de conteúdo rico com Lexical — base pronta para expandir.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <LexicalEditor />
        <p className="text-muted-foreground text-xs">
          Em breve: persistência, formatação avançada e listagem de documentos.
        </p>
      </CardContent>
    </Card>
  );
}
