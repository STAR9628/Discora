"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useRoomEvidence, useVoteEvidence, useRetractEvidence } from "@/features/discussions/hooks/use-discussions";
import type { DiscussionEvidence, DiscussionClaim } from "@/features/discussions/types";
import { FileText, ThumbsUp, ThumbsDown, GitBranch, ExternalLink, Search, RotateCcw, AlertCircle } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SaveButton } from "@/features/saves/components/save-button";

interface RoomEvidenceSectionProps {
  roomId: string;
  claims: DiscussionClaim[] | undefined;
  onNavigateToClaim?: (claimId: string) => void;
  onReportEvidence?: (evidence: DiscussionEvidence) => void;
  evidenceList?: DiscussionEvidence[] | undefined;
  isLoading?: boolean;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function RoomEvidenceSection({
  roomId,
  claims,
  onNavigateToClaim,
  onReportEvidence,
  evidenceList: externalEvidence,
  isLoading: externalLoading,
}: RoomEvidenceSectionProps) {
  const { user } = useAuth();
  const internalEvidence = useRoomEvidence(roomId, externalEvidence === undefined);
  const evidenceList = externalEvidence !== undefined ? externalEvidence : internalEvidence.data;
  const isLoading = externalEvidence !== undefined ? (externalLoading ?? false) : internalEvidence.isLoading;
  const error = externalEvidence !== undefined ? null : (internalEvidence.error as Error | null);
  const [filterDirection, setFilterDirection] = useState<"all" | "support" | "contradict" | "context">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [retractTarget, setRetractTarget] = useState<DiscussionEvidence | null>(null);

  const claimMap = useMemo(() => {
    const map = new Map<string, string>();
    if (claims) {
      for (const c of claims) {
        map.set(c.id, c.content);
      }
    }
    return map;
  }, [claims]);

  const filteredEvidence = useMemo(() => {
    if (!evidenceList) return [];
    return evidenceList.filter((item) => {
      if (filterDirection !== "all" && item.direction !== filterDirection) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesContent = item.content.toLowerCase().includes(q);
        const matchesSource = item.sourceTitle?.toLowerCase().includes(q) || item.sourceUrl?.toLowerCase().includes(q);
        const matchesClaim = claimMap.get(item.claimId)?.toLowerCase().includes(q);
        return matchesContent || matchesSource || matchesClaim;
      }
      return true;
    });
  }, [evidenceList, filterDirection, searchQuery, claimMap]);

  const counts = useMemo(() => {
    const res = { all: 0, support: 0, contradict: 0, context: 0 };
    if (!evidenceList) return res;
    res.all = evidenceList.length;
    for (const e of evidenceList) {
      if (e.direction === "support") res.support++;
      else if (e.direction === "contradict") res.contradict++;
      else if (e.direction === "context") res.context++;
    }
    return res;
  }, [evidenceList]);

  return (
    <section id="evidence" aria-labelledby="evidence-bank-heading" className="space-y-4 pt-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary shrink-0" />
          <h2 id="evidence-bank-heading" className="text-lg font-bold text-foreground">
            Evidence Bank ({evidenceList?.length ?? 0})
          </h2>
        </div>

        {/* Direction Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {(
            [
              { key: "all", label: "All", count: counts.all },
              { key: "support", label: "Supports", count: counts.support },
              { key: "contradict", label: "Contradicts", count: counts.contradict },
              { key: "context", label: "Context", count: counts.context },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterDirection(tab.key)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                filterDirection === tab.key
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "bg-muted/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] opacity-70">({tab.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter evidence by keyword, source, or claim..."
          className="w-full rounded-xl border border-input bg-background/50 pl-9 pr-4 py-2 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-24 rounded-xl border border-border bg-card/20 p-4 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Failed to load evidence bank: {(error as Error).message}</span>
        </div>
      ) : filteredEvidence.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-card/10 p-8 text-center space-y-2">
          <FileText className="h-6 w-6 text-muted-foreground mx-auto" />
          <p className="text-xs font-semibold text-foreground">No evidence items match your filters</p>
          <p className="text-[11px] text-muted-foreground">
            {evidenceList?.length === 0
              ? "Evidence attached to claims in this room will appear here automatically."
              : "Try adjusting your search query or filter selection."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvidence.map((ev) => (
            <EvidenceCardItem
              key={ev.id}
              evidence={ev}
              claimContent={claimMap.get(ev.claimId)}
              roomId={roomId}
              currentUserId={user?.id}
              onNavigateToClaim={onNavigateToClaim}
              onReportEvidence={onReportEvidence}
              onRetractRequest={(target) => setRetractTarget(target)}
            />
          ))}
        </div>
      )}

      {/* Retract Confirm Dialog */}
      {retractTarget && (
        <RetractEvidenceModal
          roomId={roomId}
          evidence={retractTarget}
          onClose={() => setRetractTarget(null)}
        />
      )}
    </section>
  );
}

function EvidenceCardItem({
  evidence,
  claimContent,
  roomId,
  currentUserId,
  onNavigateToClaim,
  onReportEvidence,
  onRetractRequest,
}: {
  evidence: DiscussionEvidence;
  claimContent?: string;
  roomId: string;
  currentUserId?: string;
  onNavigateToClaim?: (claimId: string) => void;
  onReportEvidence?: (evidence: DiscussionEvidence) => void;
  onRetractRequest: (evidence: DiscussionEvidence) => void;
}) {
  const voteMutation = useVoteEvidence(roomId, evidence.claimId, evidence.id);
  const isAuthor = currentUserId && evidence.createdBy === currentUserId;

  const directionBadge = (dir: string) => {
    switch (dir) {
      case "support":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/25">
            <ThumbsUp className="h-2.5 w-2.5" />
            Supports
          </span>
        );
      case "contradict":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-500/25">
            <ThumbsDown className="h-2.5 w-2.5" />
            Contradicts
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold text-violet-400 border border-violet-500/25">
            <GitBranch className="h-2.5 w-2.5" />
            Context
          </span>
        );
    }
  };

  return (
    <article className="rounded-xl border border-border/80 bg-card/30 p-4 space-y-2.5 hover:border-border transition-all">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2">
          {directionBadge(evidence.direction)}
          {evidence.evidenceType && (
            <span className="capitalize text-[10px] font-medium rounded bg-muted/30 px-1.5 py-0.5">
              {evidence.evidenceType.replace("_", " ")}
            </span>
          )}
        </div>
        <span className="text-[10px]">{timeAgo(evidence.createdAt)}</span>
      </div>

      <p className="text-xs text-foreground/90 leading-relaxed font-normal">{evidence.content}</p>

      {/* Linked Claim snippet */}
      {claimContent && (
        <button
          onClick={() => onNavigateToClaim?.(evidence.claimId)}
          className="w-full text-left rounded-lg bg-muted/20 p-2 text-[11px] text-muted-foreground hover:bg-muted/30 transition-colors border border-border/30 flex items-start gap-1.5 cursor-pointer"
        >
          <GitBranch className="h-3 w-3 text-primary shrink-0 mt-0.5" />
          <span className="line-clamp-1 italic">
            Claim: &ldquo;{claimContent}&rdquo;
          </span>
        </button>
      )}

      {/* Source Link & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/30 text-xs">
        {evidence.sourceUrl ? (
          <a
            href={evidence.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            <span>{evidence.sourceTitle || "Source Link"}</span>
          </a>
        ) : (
          <span className="text-[11px] text-muted-foreground italic">No external URL attached</span>
        )}

        <div className="flex items-center gap-3">
          {/* Votes */}
          <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-0.5">
            <button
              onClick={() => voteMutation.mutate(evidence.userVote === "agree" ? null : "agree")}
              disabled={voteMutation.isPending}
              className={`p-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                evidence.userVote === "agree"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Agree with evidence validity"
            >
              <ThumbsUp className="h-3 w-3" />
              <span>{evidence.agreeCount}</span>
            </button>
            <button
              onClick={() => voteMutation.mutate(evidence.userVote === "disagree" ? null : "disagree")}
              disabled={voteMutation.isPending}
              className={`p-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                evidence.userVote === "disagree"
                  ? "bg-rose-500/20 text-rose-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Disagree with evidence validity"
            >
              <ThumbsDown className="h-3 w-3" />
              <span>{evidence.disagreeCount}</span>
            </button>
          </div>

          {/* Retract button if author */}
          {isAuthor && !evidence.isRetracted && (
            <button
              onClick={() => onRetractRequest(evidence)}
              className="text-[10px] text-destructive hover:underline flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Retract
            </button>
          )}

          {/* Report */}
          {onReportEvidence && (
            <button
              onClick={() => onReportEvidence(evidence)}
              className="text-[10px] text-muted-foreground hover:text-destructive"
              title="Report evidence"
            >
              Report
            </button>
          )}

          <SaveButton targetType="evidence" targetId={evidence.id} />
        </div>
      </div>
    </article>
  );
}

function RetractEvidenceModal({
  roomId,
  evidence,
  onClose,
}: {
  roomId: string;
  evidence: DiscussionEvidence;
  onClose: () => void;
}) {
  const retractMutation = useRetractEvidence(roomId, evidence.claimId);

  return (
    <ConfirmDialog
      open={true}
      title="Retract evidence?"
      description="Retracting evidence marks it as withdrawn. This action is permanent."
      confirmLabel="Retract Evidence"
      variant="danger"
      onConfirm={async () => {
        try {
          await retractMutation.mutateAsync(evidence.id);
          toast.success("Evidence retracted.");
        } catch (err) {
          toast.error("Failed to retract evidence.", {
            description: err instanceof Error ? err.message : "Please try again.",
          });
        } finally {
          onClose();
        }
      }}
      onCancel={onClose}
    />
  );
}
