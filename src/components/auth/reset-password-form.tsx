"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
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
  resetPasswordSchema,
  type ResetPasswordInput,
} from "@/lib/validations/password";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    setValue("token", token);
  }, [token, setValue]);

  async function onSubmit(data: ResetPasswordInput) {
    try {
      const response = await api.post<{ message: string }>(
        "/auth/reset-password",
        data,
      );

      toast.success("Senha redefinida", {
        description: response.data.message,
      });
      router.push("/sign-in");
    } catch (error) {
      toast.error("Não foi possível redefinir", {
        description:
          error instanceof Error ? error.message : "Tente novamente.",
      });
    }
  }

  if (!token) {
    return (
      <AuthLayout
        title="Link inválido"
        subtitle="Solicite um novo email de recuperação."
      >
        <Card className="border-gold/20 mt-2 shadow-lg">
          <CardContent className="space-y-4 pt-6">
            <p className="text-muted-foreground text-sm">
              O link de redefinição está incompleto ou expirou.
            </p>
            <Button
              asChild
              className="bg-lapis hover:bg-lapis/90 text-papyrus w-full"
            >
              <Link href="/forgot-password">Solicitar novo link</Link>
            </Button>
          </CardContent>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Nova senha"
      subtitle="Defina uma nova senha para sua conta."
    >
      <Card className="border-gold/20 mt-2 shadow-lg">
        <CardHeader>
          <CardTitle className="font-display tracking-wide">
            Redefinir senha
          </CardTitle>
          <CardDescription>
            Use pelo menos 8 caracteres com maiúscula, minúscula e número.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <input type="hidden" {...register("token")} />

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-destructive text-sm">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!errors.confirmPassword}
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-destructive text-sm">
                  {errors.confirmPassword.message}
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
                  Salvando...
                </>
              ) : (
                "Salvar nova senha"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </AuthLayout>
  );
}
