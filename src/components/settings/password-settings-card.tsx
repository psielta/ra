"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

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
import { useChangePassword } from "@/hooks/use-profile";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/lib/validations/password";

export function PasswordSettingsCard() {
  const changePassword = useChangePassword();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(data: ChangePasswordInput) {
    try {
      const response = await changePassword.mutateAsync(data);
      reset();
      toast.success("Senha alterada", {
        description: response.message,
      });
    } catch (error) {
      toast.error("Não foi possível alterar a senha", {
        description:
          error instanceof Error ? error.message : "Tente novamente.",
      });
    }
  }

  return (
    <Card className="border-gold/15">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2 tracking-wide">
          <KeyRound className="text-gold size-5" />
          Senha
        </CardTitle>
        <CardDescription>
          Altere sua senha de acesso. Esqueceu a senha atual? Use{" "}
          <a href="/forgot-password" className="text-gold hover:underline">
            recuperar acesso
          </a>
          .
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password">Senha atual</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.currentPassword}
              {...register("currentPassword")}
            />
            {errors.currentPassword && (
              <p className="text-destructive text-sm">
                {errors.currentPassword.message}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!errors.newPassword}
                {...register("newPassword")}
              />
              {errors.newPassword && (
                <p className="text-destructive text-sm">
                  {errors.newPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-new-password">Confirmar nova senha</Label>
              <Input
                id="confirm-new-password"
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
          </div>
        </CardContent>

        <CardFooter className="pt-2">
          <Button
            type="submit"
            className="cursor-pointer"
            disabled={!isDirty || changePassword.isPending}
          >
            {changePassword.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Alterando...
              </>
            ) : (
              "Alterar senha"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
