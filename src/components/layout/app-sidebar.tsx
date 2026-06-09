"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const NAV_ITEMS = [
  {
    href: "/availability",
    label: "Employee Availability",
    icon: CalendarDays,
  },
  {
    href: "/schedule",
    label: "Schedule Output",
    icon: LayoutGrid,
  },
  {
    href: "/settings",
    label: "Data Ingestion",
    icon: Settings2,
  },
] as const;

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-screen shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 transition-[width] duration-200 dark:border-zinc-800 dark:bg-zinc-950",
        collapsed ? "w-[68px]" : "w-64",
      )}
    >
      <div className="flex h-14 items-center justify-between px-3">
        {!collapsed ? (
          <div className="min-w-0 px-1">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              UHP Schedule
            </p>
            <p className="truncate text-[11px] text-zinc-500">
              Hospitality Ops
            </p>
          </div>
        ) : (
          <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-xs font-semibold text-emerald-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-emerald-400">
            U
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn("shrink-0", collapsed && "mx-auto")}
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <Separator />

      <nav className="flex-1 space-y-1 p-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900/60 dark:hover:text-zinc-100",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  active ? "text-emerald-400" : "text-zinc-500",
                )}
              />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-zinc-200 p-2 dark:border-zinc-800">
        <ThemeToggle collapsed={collapsed} />
        {!collapsed ? (
          <p className="px-1 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-600">
            Import roster and schedule files from Settings to sync both dashboards.
          </p>
        ) : null}
      </div>
    </aside>
  );
}
