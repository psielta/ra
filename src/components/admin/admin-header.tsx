"use client";

import { LogOut, User } from "lucide-react";
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
