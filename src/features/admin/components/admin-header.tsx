"use client";

import Link from "next/link";
import {
  ShieldAlert,
  ArrowLeft,
  LayoutDashboard,
  DoorOpen,
  MessageSquareHeart,
  ShieldCheck,
  ScrollText,
  History,
} from "lucide-react";

export type AdminTab = "overview" | "rooms" | "feedback" | "moderation" | "audit" | "lifecycle";

interface AdminHeaderProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  pendingFeedbackCount?: number;
  pendingFlagsCount?: number;
}

export function AdminHeader({
  activeTab,
  onTabChange,
  pendingFeedbackCount = 0,
  pendingFlagsCount = 0,
}: AdminHeaderProps) {
  const tabs: Array<{
    id: AdminTab;
    label: string;
    icon: typeof LayoutDashboard;
    badge?: number;
  }> = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "rooms", label: "Rooms", icon: DoorOpen },
    {
      id: "feedback",
      label: "Feedback",
      icon: MessageSquareHeart,
      badge: pendingFeedbackCount,
    },
    {
      id: "moderation",
      label: "Moderation",
      icon: ShieldCheck,
      badge: pendingFlagsCount,
    },
    { id: "audit", label: "Audit Logs", icon: ScrollText },
    { id: "lifecycle", label: "Lifecycle", icon: History },
  ];

  return (
    <header className="border-b border-border bg-card/70 backdrop-blur-md sticky top-0 z-30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold tracking-tight text-foreground">
                  Discora Admin
                </span>
                <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive border border-destructive/20 uppercase tracking-wider">
                  Owner Only
                </span>
              </div>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Operational Oversight & Platform Safety
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to App</span>
            </Link>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav
          className="flex space-x-1 overflow-x-auto no-scrollbar py-2 -mb-px"
          aria-label="Admin console tabs"
          role="tablist"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange(tab.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                {typeof tab.badge === "number" && tab.badge > 0 && (
                  <span
                    className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                      isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-destructive/15 text-destructive"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
