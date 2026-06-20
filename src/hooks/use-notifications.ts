"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/axios";
import type {
  NotificationDto,
  NotificationListResponse,
} from "@/types/notifications";

export const notificationQueryKey = ["notifications"] as const;

export function useNotifications(limit = 20) {
  return useQuery({
    queryKey: [...notificationQueryKey, { limit }],
    queryFn: async () => {
      const { data } = await api.get<NotificationListResponse>(
        `/notifications?limit=${limit}`,
      );
      return data;
    },
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data } = await api.patch<NotificationDto>(
        `/notifications/${notificationId}/read`,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationQueryKey });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ updated: number }>(
        "/notifications/read-all",
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationQueryKey });
    },
  });
}

export function usePublishTestNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<NotificationDto>(
        "/notifications/publish",
        {
          type: "SUCCESS",
          category: "SYSTEM",
          title: "Notificação de teste",
          message:
            "O canal em tempo real está ativo. Você verá alertas aqui quando jobs e ações do app forem concluídos.",
        },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationQueryKey });
    },
  });
}
