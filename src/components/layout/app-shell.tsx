import type { ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="h-screen overflow-hidden bg-background text-foreground">
      <div className="flex h-full">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto pb-16 md:pb-0 md:pl-64">
          <Header />
          <main className="flex-1">{children}</main>
        </div>
      </div>
      <MobileNav />
    </div>
  );
}
