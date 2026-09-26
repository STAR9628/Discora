"use client";

import { useState, useEffect, useCallback } from "react";
import {
  History,
  Trash2,
  Filter,
  Search,
  Loader2,
  Calendar,
  User,
  Layers,
  FileText,
  RotateCcw,
} from "lucide-react";
import type { AdminDeletedContentItem, AdminContentRevisionItem } from "../types";
import { getDeletedContentAction, getContentRevisionsAction } from "@/app/admin/actions";
import { formatDate } from "@/lib/date";
import { toast } from "sonner";

export function AdminLifecycle() {
  const [subTab, setSubTab] = useState<"deleted" | "revisions">("deleted");
  const [contentTypeFilter, setContentTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [deletedItems, setDeletedItems] = useState<AdminDeletedContentItem[]>([]);
  const [revisionItems, setRevisionItems] = useState<AdminContentRevisionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDeleted = useCallback(async (type?: string) => {
    setIsLoading(true);
    const res = await getDeletedContentAction(type);
    setIsLoading(false);
    if (res.success && res.data) {
      setDeletedItems(res.data);
    } else {
      toast.error(res.error || "Failed to load deleted content");
    }
  }, []);

  const fetchRevisions = useCallback(async (type?: string) => {
    setIsLoading(true);
    const res = await getContentRevisionsAction(type);
    setIsLoading(false);
    if (res.success && res.data) {
      setRevisionItems(res.data);
    } else {
      toast.error(res.error || "Failed to load content revisions");
    }
  }, []);

  useEffect(() => {
    if (subTab === "deleted") {
      fetchDeleted(contentTypeFilter);
    } else {
      fetchRevisions(contentTypeFilter);
    }
  }, [subTab, contentTypeFilter, fetchDeleted, fetchRevisions]);

  const filteredDeleted = deletedItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.content_preview.toLowerCase().includes(q) ||
      item.content_id.toLowerCase().includes(q) ||
      (item.author_id && item.author_id.toLowerCase().includes(q))
    );
  });

  const filteredRevisions = revisionItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.previous_content.toLowerCase().includes(q) ||
      item.content_id.toLowerCase().includes(q) ||
      (item.edited_by && item.edited_by.toLowerCase().includes(q))
    );
  });

  const contentTypes = [
    { id: "all", label: "All Types" },
    { id: "claim", label: "Claims" },
    { id: "argument", label: "Arguments" },
    { id: "evidence", label: "Evidence" },
    { id: "question", label: "Questions" },
    { id: "message", label: "Messages" },
    { id: "inquiry", label: "Inquiries" },
    { id: "inquiry_response", label: "Inquiry Responses" },
  ];

  return (
    <div className="space-y-6">
      {/* Subnav & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <span>Content Lifecycle & Immutability Oversight</span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Server-enforced audit log of soft-deleted items and revision snapshots
          </p>
        </div>

        {/* View Switcher */}
        <div className="inline-flex rounded-lg border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setSubTab("deleted")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              subTab === "deleted"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Soft-Deleted Content</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab("revisions")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              subTab === "revisions"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Audit Revisions</span>
          </button>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          {contentTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setContentTypeFilter(type.id)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                contentTypeFilter === type.id
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search preview or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-input bg-card pl-9 pr-3 py-1.5 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-xs">Loading audit records...</span>
        </div>
      ) : subTab === "deleted" ? (
        /* Soft-Deleted Content List */
        filteredDeleted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center text-muted-foreground">
            <Trash2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm font-semibold">No soft-deleted content found</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Items deleted by authors within the 5-minute window or removed by admins will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-muted-foreground">
              Showing {filteredDeleted.length} soft-deleted {filteredDeleted.length === 1 ? "record" : "records"}
            </div>
            <div className="divide-y divide-border/40 rounded-2xl border border-border/80 bg-card/60 overflow-hidden shadow-xs backdrop-blur-sm">
              {filteredDeleted.map((item) => (
                <div key={`${item.content_type}-${item.content_id}`} className="p-4 sm:p-5 space-y-2.5 hover:bg-muted/10 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-[10px] font-bold text-destructive uppercase tracking-wider border border-destructive/20">
                        {item.content_type}
                      </span>
                      <code className="text-[11px] font-mono text-muted-foreground">
                        ID: {item.content_id.slice(0, 8)}...
                      </code>
                      {item.room_id && (
                        <code className="text-[11px] font-mono text-muted-foreground/70">
                          Room: {item.room_id.slice(0, 8)}...
                        </code>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Deleted: {formatDate(item.deleted_at)}
                      </span>
                    </div>
                  </div>

                  {/* Content Preview */}
                  <div className="rounded-xl border border-border/40 bg-muted/20 p-3 text-xs md:text-sm text-foreground/90 font-mono leading-relaxed whitespace-pre-wrap">
                    {item.content_preview}
                  </div>

                  {/* Footer metadata */}
                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground/75 pt-1">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Author: <span className="font-mono">{item.author_id ? item.author_id.slice(0, 8) : "System"}</span>
                    </span>
                    <span>•</span>
                    <span>
                      Deleted By: <span className="font-mono">{item.deleted_by ? item.deleted_by.slice(0, 8) : "Unknown"}</span>
                    </span>
                    <span>•</span>
                    <span>Created: {formatDate(item.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      ) : (
        /* Audit Revisions List */
        filteredRevisions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center text-muted-foreground">
            <RotateCcw className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm font-semibold">No content revisions found</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Snapshots created when authors or admins edit content within the allowed window are recorded here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs font-semibold text-muted-foreground">
              Showing {filteredRevisions.length} revision {filteredRevisions.length === 1 ? "snapshot" : "snapshots"}
            </div>
            <div className="divide-y divide-border/40 rounded-2xl border border-border/80 bg-card/60 overflow-hidden shadow-xs backdrop-blur-sm">
              {filteredRevisions.map((rev) => (
                <div key={rev.revision_id} className="p-4 sm:p-5 space-y-2.5 hover:bg-muted/10 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wider border border-primary/20">
                        {rev.content_type}
                      </span>
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-bold text-foreground">
                        Rev #{rev.revision_number}
                      </span>
                      <code className="text-[11px] font-mono text-muted-foreground">
                        Target ID: {rev.content_id.slice(0, 8)}...
                      </code>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Captured: {formatDate(rev.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Previous Content */}
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-1 flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      Previous Content Snapshot:
                    </div>
                    <div className="rounded-xl border border-border/40 bg-muted/20 p-3 text-xs md:text-sm text-foreground/90 font-mono leading-relaxed whitespace-pre-wrap">
                      {rev.previous_content}
                    </div>
                  </div>

                  {/* Editor metadata */}
                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground/75 pt-1">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Edited By: <span className="font-mono">{rev.edited_by ? rev.edited_by.slice(0, 8) : "System"}</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Layers className="h-3 w-3" />
                      Revision ID: <span className="font-mono">{rev.revision_id.slice(0, 8)}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}
