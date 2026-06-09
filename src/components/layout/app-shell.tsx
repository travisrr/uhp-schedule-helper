"use client";

import { useState, type ReactNode } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AppShellProps {
  children: ReactNode;
  title: string;
  description?: string;
}

export function AppShell({ children, title, description }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <AppSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h1>
          {description ? (
            <p className="mt-1 text-sm text-zinc-500">{description}</p>
          ) : null}
        </header>
        <ScrollArea className="flex-1">
          <main className="px-6 py-5">{children}</main>
        </ScrollArea>
      </div>
    </div>
  );
}
