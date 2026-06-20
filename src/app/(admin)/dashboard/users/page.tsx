import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Usuários",
};

export default function UsersPage() {
  return (
    <Card className="border-gold/15">
      <CardHeader>
        <CardTitle className="font-display tracking-wide">Usuários</CardTitle>
        <CardDescription>
          Módulo reservado para gestão de usuários com TanStack Table.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground text-sm">
          Em breve: listagem, filtros e ações administrativas.
        </p>
      </CardContent>
    </Card>
  );
}
