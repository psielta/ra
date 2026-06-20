"use client";

import { Cpu, LogOut, User } from "lucide-react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

import { MobileNav } from "@/components/admin/mobile-nav";
import { SeriesCommandTrigger } from "@/components/admin/series-command-menu";
import { UploadDrawerTrigger } from "@/components/media/upload-drawer-trigger";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

interface AdminHeaderProps {
  title?: string;
}

function getInitials(name?: string | null) {
  if (!name) return "RA";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function HlsMachineIndicator() {
  const pulseId = useUiStore((state) => state.hlsSegmentPulseId);
  const fileName = useUiStore((state) => state.hlsLastSegmentFileName);
  const bytes = useUiStore((state) => state.hlsLastSegmentBytes);
  const isActive = pulseId > 0;
  const title = fileName
    ? `HLS ${fileName}${typeof bytes === "number" ? ` (${bytes} bytes)` : ""}`
    : "HLS idle";

  return (
    <div
      key={pulseId}
      role="status"
      aria-live="polite"
      aria-label={fileName ? `Segmento HLS recebido: ${fileName}` : "HLS idle"}
      title={title}
      data-testid="hls-machine-indicator"
      className={cn(
        "border-gold/15 bg-muted/20 text-muted-foreground hidden h-9 items-center gap-2 rounded-md border px-2 font-mono text-[10px] shadow-inner sm:flex",
        isActive && "hls-machine-pulse text-gold",
      )}
    >
      <Cpu className="size-3.5 shrink-0" aria-hidden="true" />
      <span
        className="hls-machine-led bg-muted-foreground/35 size-2 shrink-0 rounded-full"
        aria-hidden="true"
      />
      <span className="flex h-4 items-end gap-0.5" aria-hidden="true">
        <span className="hls-machine-bar bg-muted-foreground/35 block h-1.5 w-1 rounded-full" />
        <span className="hls-machine-bar bg-muted-foreground/35 block h-3 w-1 rounded-full" />
        <span className="hls-machine-bar bg-muted-foreground/35 block h-2 w-1 rounded-full" />
        <span className="hls-machine-bar bg-muted-foreground/35 block h-3.5 w-1 rounded-full" />
      </span>
      <span className="hidden leading-none lg:inline">HLS</span>
      <span className="sr-only">
        {fileName ? `Segmento HLS ${fileName}` : "HLS idle"}
      </span>
    </div>
  );
}

export function AdminHeader({ title = "Dashboard" }: AdminHeaderProps) {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <header className="bg-card/80 supports-[backdrop-filter]:bg-card/60 border-gold/15 sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <MobileNav />

        <div>
          <p className="text-muted-foreground text-xs tracking-widest uppercase">
            Portfolio de mídia
          </p>
          <h1 className="font-display text-foreground text-lg tracking-wide">
            {title}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <SeriesCommandTrigger />

        <HlsMachineIndicator />

        <UploadDrawerTrigger size="sm">
          <span className="hidden sm:inline">Enviar mídia</span>
          <span className="sm:hidden">Enviar</span>
        </UploadDrawerTrigger>

        <NotificationBell />

        <Separator
          orientation="vertical"
          className="bg-gold/20 hidden h-8 sm:block"
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative size-9 cursor-pointer rounded-full"
              aria-label="Menu do usuário"
            >
              <Avatar className="ring-gold/30 size-9 ring-2">
                <AvatarImage
                  src={user?.image ?? undefined}
                  alt={user?.name ?? ""}
                />
                <AvatarFallback className="bg-lapis text-papyrus text-xs">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user?.name ?? "Usuário"}</p>
              <p className="text-muted-foreground text-xs">{user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings" className="cursor-pointer">
                <User />
                Perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => signOut({ callbackUrl: "/sign-in" })}
            >
              <LogOut />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
