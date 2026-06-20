"use client";

import {
  LayoutDashboard,
  Library,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { RaLogo } from "@/components/brand/ra-logo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

const navItems = [
  {
    title: "Início",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Biblioteca",
    href: "/dashboard/library",
    icon: Library,
  },
  {
    title: "Enviar mídia",
    href: "/dashboard/upload",
    icon: Upload,
  },
  {
    title: "Configurações",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

interface AdminSidebarProps {
  className?: string;
  onNavigate?: () => void;
}

export function AdminSidebar({ className, onNavigate }: AdminSidebarProps) {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useUiStore();

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

        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            const link = (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  sidebarCollapsed && "justify-center px-2",
                )}
              >
                <item.icon
                  className={cn("size-4 shrink-0", isActive && "text-gold")}
                />
                {!sidebarCollapsed && <span>{item.title}</span>}
              </Link>
            );

            if (sidebarCollapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{item.title}</TooltipContent>
                </Tooltip>
              );
            }

            return link;
          })}
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
