"use client";

import { useEffect, useState } from "react";
import {
  X,
  Lock,
  ShieldAlert,
  Link2,
  Calendar,
  Loader2,
} from "lucide-react";
import type { PrivateRoomInspectionPayload } from "../types";
import { inspectPrivateRoomAction } from "@/app/admin/actions";
import { formatDate } from "@/lib/date";

interface AdminPrivateRoomModalProps {
  roomId: string;
  onClose: () => void;
}

export function AdminPrivateRoomModal({
  roomId,
  onClose,
}: AdminPrivateRoomModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PrivateRoomInspectionPayload | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"messages" | "claims" | "evidence">("messages");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      const res = await inspectPrivateRoomAction(roomId);
      if (!res.success || !res.data) {
        setError(res.error || "Failed to load private room data");
      } else {
        setData(res.data);
      }
      setLoading(false);
    }
    load();
  }, [roomId]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="private-room-inspect-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-3xl rounded-xl border border-border bg-card shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <h2
                id="private-room-inspect-title"
                className="text-sm font-semibold text-foreground"
              >
                Private Room Inspection
              </h2>
              <p className="text-[11px] text-muted-foreground font-mono">
                ID: {roomId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Security / Audit Disclaimer */}
        <div className="bg-destructive/5 border-b border-destructive/15 px-5 py-3">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive/90 leading-relaxed font-medium">
              SILENT READ-ONLY INSPECTION (AUDIT-LOGGED) — This inspection has been recorded in the platform audit log.
              You are inspecting this private room strictly for safety and moderation. You cannot submit messages, create claims,
              vote, or influence room outcomes.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading && (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-xs">Loading inspection payload...</span>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
              {error}
            </div>
          )}

          {data && (
            <>
              {/* Room Overview Card */}
              <div className="rounded-lg border border-border bg-background p-4 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">
                      {data.room.title}
                    </h3>
                    {data.room.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {data.room.description}
                      </p>
                    )}
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground capitalize shrink-0">
                    {data.room.room_type}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border/50">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    Created: {formatDate(data.room.created_at)}
                  </span>
                  <span className="capitalize">
                    Status: <strong>{data.room.status}</strong>
                  </span>
                  <span className="capitalize">
                    Visibility: <strong>{data.room.visibility}</strong>
                  </span>
                </div>
              </div>

              {/* Inspection Sub-tabs */}
              <div className="border-b border-border flex gap-2">
                <button
                  onClick={() => setActiveSubTab("messages")}
                  className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                    activeSubTab === "messages"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Messages ({data.messages.length})
                </button>
                <button
                  onClick={() => setActiveSubTab("claims")}
                  className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                    activeSubTab === "claims"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Claims ({data.claims.length})
                </button>
                <button
                  onClick={() => setActiveSubTab("evidence")}
                  className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
                    activeSubTab === "evidence"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Evidence ({data.evidence.length})
                </button>
              </div>

              {/* Sub-tab Contents */}
              {activeSubTab === "messages" && (
                <div className="space-y-2">
                  {data.messages.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">
                      No messages in this private room.
                    </p>
                  ) : (
                    data.messages.map((m) => (
                      <div
                        key={m.id}
                        className="rounded-lg border border-border bg-background/50 p-3 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="font-mono">
                            Type: {m.message_type} ({m.identity_mode})
                          </span>
                          <span>{formatDate(m.created_at)}</span>
                        </div>
                        <p className="text-foreground whitespace-pre-wrap">{m.content}</p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeSubTab === "claims" && (
                <div className="space-y-2">
                  {data.claims.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">
                      No claims extracted in this private room.
                    </p>
                  ) : (
                    data.claims.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-lg border border-border bg-background/50 p-3 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>{formatDate(c.created_at)}</span>
                        </div>
                        <p className="text-foreground font-medium">{c.text}</p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeSubTab === "evidence" && (
                <div className="space-y-2">
                  {data.evidence.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">
                      No evidence cited in this private room.
                    </p>
                  ) : (
                    data.evidence.map((e) => (
                      <div
                        key={e.id}
                        className="rounded-lg border border-border bg-background/50 p-3 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="font-medium capitalize text-primary">
                            Direction: {e.direction}
                          </span>
                          <span>{formatDate(e.created_at)}</span>
                        </div>
                        <p className="text-foreground font-medium">{e.title}</p>
                        {e.url && (
                          <a
                            href={e.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                          >
                            <Link2 className="h-3 w-3" />
                            {e.url}
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-5 py-3 bg-muted/30 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-accent transition-colors"
          >
            Close Inspection
          </button>
        </div>
      </div>
    </div>
  );
}
