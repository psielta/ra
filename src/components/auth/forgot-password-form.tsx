"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/axios";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validations/password";

export function ForgotPasswordForm() {
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(data: ForgotPasswordInput) {
    try {
      const response = await api.post<{ message: string }>(
        "/auth/forgot-password",
        data,
      );
      setSubmittedMessage(response.data.message);
      toast.message("Verifique seu email", {
        description: response.data.message,
      });
    } catch (error) {
      toast.error("Não foi possível enviar", {
        description:
          error instanceof Error ? error.message : "Tente novamente.",
      });
    }
  }

  return (
    <AuthLayout
      title="Esqueci minha senha"
      subtitle="Enviaremos um link para redefinir sua senha."
    >
      <Card className="border-gold/20 mt-2 shadow-lg">
        <CardHeader>
          <CardTitle className="font-display tracking-wide">
            Recuperar acesso
          </CardTitle>
          <CardDescription>
            Informe o email da sua conta. Em desenvolvimento, abra o Mailhog em{" "}
            <a
              href="http://localhost:14012"
              target="_blank"
              rel="noreferrer"
              className="text-gold hover:underline"
            >
              localhost:14012
            </a>{" "}
            para ver o email.
          </CardDescription>
        </CardHeader>

        {submittedMessage ? (
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed">{submittedMessage}</p>
            <Button
              asChild
              className="bg-lapis hover:bg-lapis/90 text-papyrus w-full"
            >
              <Link href="/sign-in">Voltar para entrar</Link>
            </Button>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="pharaoh@memphis.eg"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-destructive text-sm">
                    {errors.email.message}
                  </p>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4 pt-6">
              <Button
                type="submit"
                className="bg-lapis hover:bg-lapis/90 text-papyrus mt-1 w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar link de recuperação"
                )}
              </Button>

              <p className="text-muted-foreground text-center text-sm">
                Lembrou a senha?{" "}
                <Link
                  href="/sign-in"
                  className="text-gold font-medium hover:underline"
                >
                  Entrar
                </Link>
              </p>
            </CardFooter>
          </form>
        )}
      </Card>
    </AuthLayout>
  );
}
