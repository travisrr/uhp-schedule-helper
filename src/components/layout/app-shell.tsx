"use client";

import { useState, type ReactNode } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
  title?: string;
  description?: string;
  compact?: boolean;
}

export function AppShell({
  children,
  title,
  description,
  compact = false,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 text-black dark:bg-zinc-950 dark:text-zinc-100">
      <div className="no-print">
        <AppSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((prev) => !prev)}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        {title ? (
          <header
            className={cn(
              "no-print shrink-0 border-b border-zinc-200 dark:border-zinc-800",
              compact ? "px-4 py-1.5" : "px-6 py-4",
            )}
          >
            <h1 className="text-base font-semibold text-black dark:text-zinc-100">
              {title}
            </h1>
            {description ? (
              <p
                className={cn(
                  "text-black dark:text-zinc-200",
                  compact ? "mt-0.5 text-xs leading-snug" : "mt-1 text-sm",
                )}
              >
                {description}
              </p>
            ) : null}
          </header>
        ) : null}
        <ScrollArea className="flex-1">
          <main className={compact ? "px-4 py-1.5" : "px-6 py-5"}>
            {children}
          </main>
        </ScrollArea>
      </div>
    </div>
  );
}
