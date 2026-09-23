"use client";

import {
  MessageSquare,
  Scale,
  Lock,
  Archive,
  AlertTriangle,
  HeartHandshake,
  ScrollText,
  ShieldCheck,
} from "lucide-react";
import type { AdminOverviewStats, AdminAuditLogItem } from "../types";
import type { AdminTab } from "./admin-header";
import { AdminPlatformIdentity } from "./admin-platform-identity";
import { formatDate } from "@/lib/date";

interface AdminOverviewProps {
  stats: AdminOverviewStats;
  recentLogs: AdminAuditLogItem[];
  onNavigateTab: (tab: AdminTab) => void;
}

export function AdminOverview({ stats, recentLogs, onNavigateTab }: AdminOverviewProps) {
  const cards = [
    {
      title: "Active Discussions",
      value: stats.active_discussions,
      icon: MessageSquare,
      tab: "rooms" as AdminTab,
      description: "Public open discussions",
    },
    {
      title: "Active Debates",
      value: stats.active_debates,
      icon: Scale,
      tab: "rooms" as AdminTab,
      description: "Public open debates",
    },
    {
      title: "Private Rooms",
      value: stats.private_rooms,
      icon: Lock,
      tab: "rooms" as AdminTab,
      description: "Access-gated rooms",
    },
    {
      title: "Archived Rooms",
      value: stats.archived_rooms,
      icon: Archive,
      tab: "rooms" as AdminTab,
      description: "Closed or frozen rooms",
    },
    {
      title: "Pending Moderation",
      value: stats.pending_flags,
      icon: AlertTriangle,
      tab: "moderation" as AdminTab,
      highlight: stats.pending_flags > 0,
      description: "Reports requiring review",
    },
    {
      title: "Pending Feedback",
      value: stats.pending_feedback,
      icon: HeartHandshake,
      tab: "feedback" as AdminTab,
      highlight: stats.pending_feedback > 0,
      description: "User suggestions & bugs",
    },
    {
      title: "Audit Events",
      value: stats.total_audit_events,
      icon: ScrollText,
      tab: "audit" as AdminTab,
      description: "Immutable administrative logs",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Epistemic Neutrality Guarantee */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">
              Operational Oversight — Zero Epistemic Authority
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Discora administrative controls operate strictly on room lifecycles, user safety, and feedback triage.
              Administrators have zero authority to declare claims true or false, assign winners or losers, alter debate positions,
              or manipulate epistemic weights. Truth and collective understanding are determined solely through evidence in dialogue.
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.title}
              onClick={() => onNavigateTab(card.tab)}
              className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all hover:shadow-xs hover:-translate-y-0.5 ${
                card.highlight
                  ? "border-destructive/30 bg-destructive/5 hover:bg-destructive/10"
                  : "border-border bg-card hover:bg-accent/40"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {card.title}
                </span>
                <Icon
                  className={`h-4 w-4 ${
                    card.highlight ? "text-destructive" : "text-muted-foreground"
                  }`}
                />
              </div>
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {card.value}
              </span>
              <span className="text-[11px] text-muted-foreground mt-1">
                {card.description}
              </span>
            </button>
          );
        })}
      </div>

      {/* Platform Identity (owner-only operational control) */}
      <AdminPlatformIdentity />

      {/* Recent Activity Snapshot */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">
              Recent Administrative Audit Events
            </h3>
          </div>
          <button
            onClick={() => onNavigateTab("audit")}
            className="text-xs font-medium text-primary hover:underline"
          >
            View all logs →
          </button>
        </div>

        {recentLogs.length === 0 ? (
          <div className="flex h-24 items-center justify-center text-xs text-muted-foreground">
            No audit events recorded yet.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {recentLogs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="py-2.5 flex items-center justify-between text-xs gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-mono font-medium text-foreground shrink-0">
                    {log.action}
                  </span>
                  <span className="text-muted-foreground truncate">
                    {log.target_type} {log.target_id ? `(${log.target_id.slice(0, 8)}...)` : ""}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {formatDate(log.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
