"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

import { api } from "@/lib/axios";
import type { ChangePasswordInput } from "@/lib/validations/password";
import type { ProfileDto, UpdateProfileInput } from "@/lib/validations/profile";

export const profileQueryKey = ["profile"] as const;

export function useProfile() {
  return useQuery({
    queryKey: profileQueryKey,
    queryFn: async () => {
      const { data } = await api.get<ProfileDto>("/profile");
      return data;
    },
  });
}

function useSyncProfileSession() {
  const { update } = useSession();

  return async (profile: ProfileDto) => {
    await update({
      name: profile.name ?? undefined,
      image: profile.image ? `${profile.image}?v=${Date.now()}` : null,
    });
  };
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const syncSession = useSyncProfileSession();

  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      const { data } = await api.patch<ProfileDto>("/profile", input);
      return data;
    },
    onSuccess: async (profile) => {
      queryClient.setQueryData(profileQueryKey, profile);
      await syncSession(profile);
    },
  });
}

export function useUploadAvatar() {
  const queryClient = useQueryClient();
  const syncSession = useSyncProfileSession();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("avatar", file);

      const { data } = await api.post<ProfileDto>("/profile/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      return data;
    },
    onSuccess: async (profile) => {
      queryClient.setQueryData(profileQueryKey, profile);
      await syncSession(profile);
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: ChangePasswordInput) => {
      const { data } = await api.patch<{ message: string }>(
        "/profile/password",
        input,
      );
      return data;
    },
  });
}

export function useDeleteAvatar() {
  const queryClient = useQueryClient();
  const syncSession = useSyncProfileSession();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.delete<ProfileDto>("/profile/avatar");
      return data;
    },
    onSuccess: async (profile) => {
      queryClient.setQueryData(profileQueryKey, profile);
      await syncSession(profile);
    },
  });
}
