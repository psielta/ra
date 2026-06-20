"use client";

import {
  Folder,
  FolderOpen,
  LayoutDashboard,
  Layers,
  ListOrdered,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

import { RaLogo } from "@/components/brand/ra-logo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSeriesList } from "@/hooks/use-series";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

const navItems = [
  {
    title: "Início",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Recursos",
    href: "/resources",
    icon: FolderOpen,
  },
  {
    title: "Séries",
    href: "/series",
    icon: Layers,
  },
  {
    title: "Fila",
    href: "/queue",
    icon: ListOrdered,
  },
];

interface AdminSidebarProps {
  className?: string;
  onNavigate?: () => void;
}

function isNavItemActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  if (href === "/series") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNavLink({
  href,
  title,
  icon: Icon,
  isActive,
  sidebarCollapsed,
  onNavigate,
}: {
  href: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  isActive: boolean;
  sidebarCollapsed: boolean;
  onNavigate?: () => void;
}) {
  const link = (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-sidebar-accent text-sidebar-primary"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
        sidebarCollapsed && "justify-center px-2",
      )}
    >
      <Icon className={cn("size-4 shrink-0", isActive && "text-gold")} />
      {!sidebarCollapsed && <span className="truncate">{title}</span>}
    </Link>
  );

  if (sidebarCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{title}</TooltipContent>
      </Tooltip>
    );
  }

  return link;
}

export function AdminSidebar({ className, onNavigate }: AdminSidebarProps) {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const { data: seriesList = [], isLoading: isSeriesLoading } = useSeriesList();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "bg-sidebar text-sidebar-foreground border-sidebar-border flex h-full flex-col border-r transition-all duration-300",
          sidebarCollapsed ? "w-[68px]" : "w-64",
          className,
        )}
      >
        <div
          className={cn(
            "border-sidebar-border flex h-16 items-center border-b px-4",
            sidebarCollapsed ? "justify-center" : "justify-between",
          )}
        >
          {!sidebarCollapsed && (
            <RaLogo size="sm" showTagline variant="light" />
          )}
          {sidebarCollapsed && (
            <div className="sun-disk ring-gold/30 size-8 rounded-full ring-2" />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground hover:bg-sidebar-accent hidden cursor-pointer lg:inline-flex"
            onClick={toggleSidebar}
            aria-label={
              sidebarCollapsed ? "Expandir sidebar" : "Recolher sidebar"
            }
          >
            {sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>
        </div>

        <nav className="flex min-h-0 flex-1 flex-col p-3">
          <div className="space-y-1">
            {navItems.map((item) => (
              <SidebarNavLink
                key={item.href}
                href={item.href}
                title={item.title}
                icon={item.icon}
                isActive={isNavItemActive(pathname, item.href)}
                sidebarCollapsed={sidebarCollapsed}
                onNavigate={onNavigate}
              />
            ))}
          </div>

          <Separator className="bg-sidebar-border my-3" />

          {!sidebarCollapsed ? (
            <p className="text-sidebar-foreground/50 mb-2 px-3 text-xs tracking-wider uppercase">
              Minhas séries
            </p>
          ) : null}

          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {isSeriesLoading ? (
              <div
                className={cn(
                  "text-sidebar-foreground/60 flex items-center gap-2 px-3 py-2 text-sm",
                  sidebarCollapsed && "justify-center px-2",
                )}
              >
                <Loader2 className="size-4 animate-spin" />
                {!sidebarCollapsed ? "Carregando..." : null}
              </div>
            ) : seriesList.length === 0 ? (
              !sidebarCollapsed ? (
                <p className="text-sidebar-foreground/50 px-3 py-2 text-xs">
                  Nenhuma série ainda.{" "}
                  <Link
                    href="/series"
                    onClick={onNavigate}
                    className="text-gold hover:underline"
                  >
                    Criar
                  </Link>
                </p>
              ) : null
            ) : (
              seriesList.map((series) => {
                const href = `/series/${series.id}`;

                return (
                  <SidebarNavLink
                    key={series.id}
                    href={href}
                    title={series.title}
                    icon={Folder}
                    isActive={pathname === href}
                    sidebarCollapsed={sidebarCollapsed}
                    onNavigate={onNavigate}
                  />
                );
              })
            )}
          </div>
        </nav>

        <div className="p-3">
          <Separator className="bg-sidebar-border mb-3" />
          {!sidebarCollapsed && (
            <p className="text-sidebar-foreground/50 px-3 text-xs tracking-wider uppercase">
              Ra · Portfolio v0.1
            </p>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
