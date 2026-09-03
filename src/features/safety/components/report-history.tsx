"use client";

import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "@/services/supabase/client";
import { Loader2, AlertTriangle, Flag, Clock, CheckCircle, XCircle } from "lucide-react";
import { formatDate } from "@/lib/date";

interface ModerationFlagSummary {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  resolvedAt: string | null;
}

function useMyReports() {
  return useQuery({
    queryKey: ["myReports"],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase.rpc("get_my_moderation_flags");
      if (error) {
        throw new Error(error.message);
      }
      return (data || []) as ModerationFlagSummary[];
    },
  });
}

function statusLabel(status: string): { text: string; icon: React.ElementType; color: string } {
  switch (status) {
    case "pending":
      return { text: "Under Review", icon: Clock, color: "text-amber-500" };
    case "resolved_hidden":
      return { text: "Content Hidden", icon: CheckCircle, color: "text-emerald-500" };
    case "resolved_dismissed":
      return { text: "Dismissed", icon: XCircle, color: "text-muted-foreground" };
    case "resolved_restored":
      return { text: "Restored", icon: CheckCircle, color: "text-blue-500" };
    default:
      return { text: status, icon: Flag, color: "text-muted-foreground" };
  }
}

export function ReportHistory() {
  const { data: reports, isLoading, error } = useMyReports();

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <h3 className="text-sm font-semibold text-destructive">Unable to load report history</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {error instanceof Error ? error.message : "An unexpected error occurred."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card/50 p-8 text-center">
        <Flag className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <h3 className="mt-3 text-sm font-semibold">No Reports</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          You haven&apos;t submitted any reports yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => {
        const status = statusLabel(report.status);
        const StatusIcon = status.icon;
        return (
          <div
            key={report.id}
            className="rounded-lg border border-border bg-card p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {report.reason}
                </p>
                <p className="text-[10px] text-muted-foreground/60">
                  Submitted {formatDate(report.createdAt)}
                </p>
              </div>
              <span className={`flex items-center gap-1 text-xs font-medium ${status.color}`}>
                <StatusIcon className="h-3.5 w-3.5" />
                {status.text}
              </span>
            </div>
            {report.resolvedAt && (
              <p className="mt-2 text-[10px] text-muted-foreground/40">
                Resolved {formatDate(report.resolvedAt)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
