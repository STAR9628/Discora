"use client";

import { useState, useEffect, type ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { FeedbackModal } from "@/features/settings/components/feedback-modal";
import { DiscoveryDeckModal } from "@/features/onboarding";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  // Restore sidebar collapsed preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("discora_sidebar_collapsed");
      if (saved === "false") {
        setIsSidebarCollapsed(false);
      }
    } catch {
      // Ignore localStorage read errors in private browsing
    }
  }, []);

  const handleToggleCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("discora_sidebar_collapsed", String(next));
      } catch {
        // Ignore localStorage write errors
      }
      return next;
    });
  };

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground">
      <div className="flex h-full">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
          onOpenFeedback={() => setIsFeedbackOpen(true)}
        />
        <div
          className={`flex min-w-0 flex-1 flex-col overflow-y-auto pb-16 md:pb-0 transition-[padding] duration-200 ease-in-out ${
            isSidebarCollapsed ? "md:pl-16" : "md:pl-64"
          }`}
        >
          <Header />
          <main className="flex-1">{children}</main>
        </div>
      </div>
      <MobileNav />
      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
      <DiscoveryDeckModal />
    </div>
  );
}
