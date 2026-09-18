"use client";

import { useState } from "react";
import {
  ScrollText,
  Filter,
  Shield,
  Clock,
  UserCheck,
  Eye,
  Archive,
  RotateCcw,
  CheckCircle,
} from "lucide-react";
import type { AdminAuditLogItem } from "../types";
import { formatDate } from "@/lib/date";

interface AdminAuditLogsProps {
  initialLogs: AdminAuditLogItem[];
}

export function AdminAuditLogs({ initialLogs }: AdminAuditLogsProps) {
  const [logs] = useState<AdminAuditLogItem[]>(initialLogs);
  const [actionFilter, setActionFilter] = useState<string>("all");

  const filteredLogs = logs.filter((log) => {
    if (actionFilter !== "all" && log.action !== actionFilter) return false;
    return true;
  });

  function getActionBadge(action: string) {
    switch (action) {
      case "PRIVATE_ROOM_INSPECTED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Eye className="h-3 w-3" />
            PRIVATE_ROOM_INSPECTED
          </span>
        );
      case "ROOM_ARCHIVED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive border border-destructive/20">
            <Archive className="h-3 w-3" />
            ROOM_ARCHIVED
          </span>
        );
      case "ROOM_RESTORED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <RotateCcw className="h-3 w-3" />
            ROOM_RESTORED
          </span>
        );
      case "FEEDBACK_REVIEWED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary border border-primary/20">
            <CheckCircle className="h-3 w-3" />
            FEEDBACK_REVIEWED
          </span>
        );
      case "FEEDBACK_ARCHIVED":
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground border border-border">
            <Archive className="h-3 w-3" />
            FEEDBACK_ARCHIVED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-mono font-medium text-foreground">
            <Shield className="h-3 w-3" />
            {action}
          </span>
        );
    }
  }

  return (
    <div className="space-y-4">
      {/* Action Filter */}
      <div className="flex flex-wrap items-center gap-1.5 bg-card p-4 rounded-xl border border-border">
        <Filter className="h-3.5 w-3.5 text-muted-foreground mr-1" />
        <span className="text-xs font-semibold text-muted-foreground mr-1">Filter Action:</span>
        {[
          { id: "all", label: "All" },
          { id: "ADMIN_ACCESS", label: "Access" },
          { id: "PRIVATE_ROOM_INSPECTED", label: "Inspections" },
          { id: "ROOM_ARCHIVED", label: "Room Archived" },
          { id: "ROOM_RESTORED", label: "Room Restored" },
          { id: "FEEDBACK_REVIEWED", label: "Feedback Reviewed" },
          { id: "FEEDBACK_ARCHIVED", label: "Feedback Archived" },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setActionFilter(f.id)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              actionFilter === f.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Log Feed */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">
              Audit Event Records ({filteredLogs.length})
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Server-Generated & Immutable
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center text-xs text-muted-foreground">
            No audit events recorded under this filter.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-accent/20 transition-colors"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {getActionBadge(log.action)}
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                      target: {log.target_type}
                    </span>
                    {log.target_id && (
                      <span className="text-[11px] text-muted-foreground font-mono truncate max-w-xs">
                        id: {log.target_id}
                      </span>
                    )}
                  </div>

                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="text-[11px] text-muted-foreground font-mono bg-background/60 rounded px-2 py-1 max-w-xl truncate">
                      {JSON.stringify(log.metadata)}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 text-[11px] text-muted-foreground shrink-0 sm:self-center">
                  <span className="flex items-center gap-1">
                    <UserCheck className="h-3 w-3" />
                    {log.admin_username ? `@${log.admin_username}` : "Platform Owner"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(log.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
