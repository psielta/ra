"use client";

import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, CheckCheck, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/hooks/use-notifications";
import { cn } from "@/lib/utils";
import type { NotificationDto } from "@/types/notifications";

const typeAccent: Record<NotificationDto["type"], string> = {
  INFO: "bg-lapis/15 text-lapis",
  SUCCESS: "bg-gold/15 text-gold",
  WARNING: "bg-sand/30 text-foreground",
  ERROR: "bg-destructive/15 text-destructive",
  JOB: "bg-gold/10 text-gold",
};

function NotificationItem({
  notification,
  onRead,
}: {
  notification: NotificationDto;
  onRead: (id: string) => void;
}) {
  const isUnread = !notification.readAt;

  return (
    <DropdownMenuItem
      className={cn(
        "cursor-pointer flex-col items-start gap-1 p-3",
        isUnread && "bg-gold/5",
      )}
      onClick={() => {
        if (isUnread) {
          onRead(notification.id);
        }
      }}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase",
            typeAccent[notification.type],
          )}
        >
          {notification.category}
        </span>
        <span className="text-muted-foreground shrink-0 text-[10px]">
          {formatDistanceToNow(new Date(notification.createdAt), {
            addSuffix: true,
            locale: ptBR,
          })}
        </span>
      </div>
      <p className="text-sm font-medium">{notification.title}</p>
      <p className="text-muted-foreground line-clamp-2 text-xs">
        {notification.message}
      </p>
    </DropdownMenuItem>
  );
}

export function NotificationBell() {
  const { data, isLoading } = useNotifications(15);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = data?.unreadCount ?? 0;
  const items = data?.items ?? [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9 shrink-0 cursor-pointer"
          aria-label="Notificações"
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="bg-gold text-primary-foreground absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full text-[10px] font-semibold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-sm font-medium">Notificações</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 cursor-pointer gap-1 px-2 text-xs"
              disabled={markAllRead.isPending}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                markAllRead.mutate();
              }}
            >
              {markAllRead.isPending ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <CheckCheck className="size-3" />
              )}
              Marcar todas
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {isLoading ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
            <Loader2 className="size-4 animate-spin" />
            Carregando...
          </div>
        ) : items.length === 0 ? (
          <div className="text-muted-foreground px-3 py-8 text-center text-sm">
            Nenhuma notificação ainda.
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {items.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={(id) => markRead.mutate(id)}
              />
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
