"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Loader2, Trash2, UserRound } from "lucide-react";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  useDeleteAvatar,
  useProfile,
  useUpdateProfile,
  useUploadAvatar,
} from "@/hooks/use-profile";
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from "@/lib/validations/profile";

function getInitials(name?: string | null) {
  if (!name) return "RA";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ProfileSettingsCard() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const deleteAvatar = useDeleteAvatar();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (profile?.name) {
      reset({ name: profile.name });
    }
  }, [profile?.name, reset]);

  const isAvatarBusy = uploadAvatar.isPending || deleteAvatar.isPending;

  async function onSubmit(data: UpdateProfileInput) {
    try {
      await updateProfile.mutateAsync(data);
      toast.success("Perfil atualizado", {
        description: "Seu nome foi salvo com sucesso.",
      });
    } catch (error) {
      toast.error("Não foi possível salvar", {
        description:
          error instanceof Error ? error.message : "Tente novamente.",
      });
    }
  }

  async function handleAvatarChange(file: File | undefined) {
    if (!file) return;

    try {
      await uploadAvatar.mutateAsync(file);
      toast.success("Foto enviada", {
        description: "Avatar hospedado no MinIO e aplicado ao perfil.",
      });
    } catch (error) {
      toast.error("Falha no upload", {
        description:
          error instanceof Error ? error.message : "Tente outra imagem.",
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleRemoveAvatar() {
    try {
      await deleteAvatar.mutateAsync();
      toast.success("Foto removida");
    } catch (error) {
      toast.error("Não foi possível remover a foto", {
        description:
          error instanceof Error ? error.message : "Tente novamente.",
      });
    }
  }

  if (isLoading) {
    return (
      <Card className="border-gold/15">
        <CardContent className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
          <Loader2 className="size-4 animate-spin" />
          Carregando perfil...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gold/15">
      <CardHeader>
        <CardTitle className="font-display flex items-center gap-2 tracking-wide">
          <UserRound className="text-gold size-5" />
          Perfil
        </CardTitle>
        <CardDescription>
          Nome e foto de perfil. A imagem é armazenada no MinIO em{" "}
          <code className="text-xs">avatars/&#123;userId&#125;/profile.*</code>.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar className="ring-gold/30 size-20 ring-2">
              <AvatarImage
                src={profile?.image ?? undefined}
                alt={profile?.name ?? "Avatar"}
              />
              <AvatarFallback className="bg-lapis text-papyrus text-lg">
                {getInitials(profile?.name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) =>
                  void handleAvatarChange(event.target.files?.[0])
                }
              />
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                disabled={isAvatarBusy}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadAvatar.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Camera className="size-4" />
                )}
                Alterar foto
              </Button>
              {profile?.image && (
                <Button
                  type="button"
                  variant="ghost"
                  className="cursor-pointer"
                  disabled={isAvatarBusy}
                  onClick={() => void handleRemoveAvatar()}
                >
                  {deleteAvatar.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  Remover
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Nome</Label>
              <Input
                id="profile-name"
                autoComplete="name"
                aria-invalid={!!errors.name}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-destructive text-sm">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                value={profile?.email ?? ""}
                disabled
                readOnly
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="pt-2">
          <Button
            type="submit"
            className="cursor-pointer"
            disabled={!isDirty || updateProfile.isPending}
          >
            {updateProfile.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar perfil"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
