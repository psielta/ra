"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { notificationQueryKey } from "@/hooks/use-notifications";
import type { NotificationDto } from "@/types/notifications";

function showNotificationToast(notification: NotificationDto) {
  const options = { description: notification.message };

  switch (notification.type) {
    case "SUCCESS":
      toast.success(notification.title, options);
      break;
    case "WARNING":
      toast.warning(notification.title, options);
      break;
    case "ERROR":
      toast.error(notification.title, options);
      break;
    default:
      toast(notification.title, options);
  }
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const sourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) {
      return;
    }

    let disposed = false;

    const connect = () => {
      if (disposed || sourceRef.current) return;

      const source = new EventSource("/api/notifications/stream");
      sourceRef.current = source;

      source.addEventListener("notification", (event) => {
        try {
          const notification = JSON.parse(
            (event as MessageEvent<string>).data,
          ) as NotificationDto;

          queryClient.invalidateQueries({ queryKey: notificationQueryKey });

          showNotificationToast(notification);
        } catch {
          // ignore malformed payloads
        }
      });

      source.onerror = () => {
        source.close();
        sourceRef.current = null;

        if (!disposed) {
          reconnectTimerRef.current = setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      disposed = true;

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      sourceRef.current?.close();
      sourceRef.current = null;
    };
  }, [queryClient, session?.user?.id, status]);

  return children;
}
