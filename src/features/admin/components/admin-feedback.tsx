"use client";

import { useState } from "react";
import {
  MessageSquareHeart,
  CheckCircle2,
  Archive,
  ExternalLink,
  Bug,
  HelpCircle,
  Lightbulb,
  MessageCircle,
  User,
  Clock,
} from "lucide-react";
import type { AdminFeedbackItem } from "../types";
import { updateFeedbackStatusAction } from "@/app/admin/actions";
import { formatDate } from "@/lib/date";
import { toast } from "@/components/ui/toast";

interface AdminFeedbackProps {
  initialFeedback: AdminFeedbackItem[];
}

export function AdminFeedback({ initialFeedback }: AdminFeedbackProps) {
  const [feedbackList, setFeedbackList] = useState<AdminFeedbackItem[]>(initialFeedback);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const filteredItems = feedbackList.filter((item) => {
    if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    return true;
  });

  async function handleUpdateStatus(id: string, newStatus: "new" | "reviewed" | "archived") {
    setActionLoading(id);
    const res = await updateFeedbackStatusAction(id, newStatus);
    setActionLoading(null);

    if (res.success) {
      toast.success(`Feedback status updated to ${newStatus}.`);
      setFeedbackList((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
      );
    } else {
      toast.error(res.error || "Failed to update feedback status");
    }
  }

  function getCategoryIcon(cat: string) {
    switch (cat) {
      case "bug":
        return <Bug className="h-3.5 w-3.5 text-destructive" />;
      case "confusing_ux":
        return <HelpCircle className="h-3.5 w-3.5 text-amber-500" />;
      case "suggestion":
        return <Lightbulb className="h-3.5 w-3.5 text-primary" />;
      default:
        return <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border">
        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground mr-1">Category:</span>
          {[
            { id: "all", label: "All" },
            { id: "bug", label: "Bugs" },
            { id: "confusing_ux", label: "UX Confusion" },
            { id: "suggestion", label: "Suggestions" },
            { id: "general", label: "General" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                categoryFilter === cat.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground mr-1">Status:</span>
          {[
            { id: "all", label: "All" },
            { id: "new", label: "New" },
            { id: "reviewed", label: "Reviewed" },
            { id: "archived", label: "Archived" },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                statusFilter === st.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feedback Feed */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 flex flex-col items-center justify-center text-xs text-muted-foreground">
            <MessageSquareHeart className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <span>No user feedback found matching the selected filters.</span>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-3 transition-all hover:border-border/80"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-medium capitalize">
                    {getCategoryIcon(item.category)}
                    {item.category.replace("_", " ")}
                  </span>

                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                      item.status === "new"
                        ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                        : item.status === "reviewed"
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.status === "new" && (
                    <button
                      onClick={() => handleUpdateStatus(item.id, "reviewed")}
                      disabled={actionLoading === item.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 text-xs font-medium transition-colors"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Mark Reviewed</span>
                    </button>
                  )}
                  {item.status !== "archived" && (
                    <button
                      onClick={() => handleUpdateStatus(item.id, "archived")}
                      disabled={actionLoading === item.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
                    >
                      <Archive className="h-3.5 w-3.5" />
                      <span>Archive</span>
                    </button>
                  )}
                  {item.status === "archived" && (
                    <button
                      onClick={() => handleUpdateStatus(item.id, "reviewed")}
                      disabled={actionLoading === item.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
                    >
                      <span>Unarchive</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {item.description}
              </p>

              {/* Metadata Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {item.username ? `@${item.username}` : "Anonymous Guest"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(item.created_at)}
                  </span>
                </div>

                {item.page_url && (
                  <a
                    href={item.page_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline truncate max-w-xs"
                    title={item.page_url}
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    <span className="truncate">{item.page_url}</span>
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
