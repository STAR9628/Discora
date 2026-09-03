"use client";

import { useState } from "react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useResolveDebate } from "@/features/debates/hooks/use-debates";
import type { Debate } from "@/features/discussions/types";
import { Trophy, Loader2, AlertCircle } from "lucide-react";
import { toast } from "@/components/ui/toast";

interface DebateResolutionProps {
  roomId: string;
  debate: Debate;
  roomCreatedBy: string;
}

export function DebateResolution({ roomId, debate, roomCreatedBy }: DebateResolutionProps) {
  const { user } = useAuth();
  const resolveMutation = useResolveDebate(roomId);
  const [summary, setSummary] = useState("");
  const [winner, setWinner] = useState<"proposition" | "opposition" | "draw" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isCreator = user?.id === roomCreatedBy;
  const isResolved = debate.status === "resolved" || debate.status === "closed";

  const hasPropositionParticipant = debate.propositionParticipantCount >= 1;
  const hasOppositionParticipant = debate.oppositionParticipantCount >= 1;
  const hasPropositionClaim = debate.propositionClaimCount >= 1;
  const hasOppositionClaim = debate.oppositionClaimCount >= 1;
  const canResolve = hasPropositionParticipant && hasOppositionParticipant && hasPropositionClaim && hasOppositionClaim;

  if (isResolved) return null;

  if (!isCreator) return null;

  const handleResolve = async () => {
    if (!winner) {
      setError("Please select a winner.");
      return;
    }
    if (summary.trim().length < 10) {
      setError("Please provide a resolution summary (at least 10 characters).");
      return;
    }

    setError(null);
    try {
      await resolveMutation.mutateAsync({
        winner,
        summary: summary.trim(),
        resolvedBy: user!.id,
      });
      toast.success("Debate resolved", {
        description: "The debate has been marked as resolved with the selected outcome.",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resolve debate.");
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card/30 p-6 shadow-sm backdrop-blur-sm space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-extrabold text-foreground uppercase tracking-wider">Resolve Debate</h3>
      </div>

      {canResolve ? (
        <>
          <p className="text-xs text-muted-foreground">
            As the debate creator, you can declare a resolution. This action is irreversible.
          </p>

          <div className="space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Select Winner
            </span>
            <div className="flex gap-2">
              {(["proposition", "opposition", "draw"] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWinner(w)}
                  className={`flex-1 rounded-xl border p-3 text-xs font-bold transition-all cursor-pointer ${
                    winner === w
                      ? w === "proposition"
                        ? "border-blue-500/50 bg-blue-500/10 text-blue-400"
                        : w === "opposition"
                        ? "border-rose-500/50 bg-rose-500/10 text-rose-400"
                        : "border-slate-500/50 bg-slate-500/10 text-slate-400"
                      : "border-border bg-card/40 text-muted-foreground hover:border-muted-foreground/30"
                  }`}
                >
                  {w === "proposition"
                    ? "Proposition"
                    : w === "opposition"
                    ? "Opposition"
                    : "Draw"}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Resolution Summary
            </label>
            <textarea
              rows={3}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Summarize the resolution, key arguments that prevailed, and any conclusions..."
              className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleResolve}
            disabled={resolveMutation.isPending || !winner || summary.trim().length < 10}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed w-full"
          >
            {resolveMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trophy className="h-4 w-4" />
            )}
            <span>Declare Resolution</span>
          </button>
        </>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Resolution unavailable — debate activity requirements not met:</p>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <span className={hasPropositionParticipant ? "text-emerald-400" : "text-muted-foreground/50"}>
                {hasPropositionParticipant ? "✓" : "✗"}
              </span>
              <span className={hasPropositionParticipant ? "text-foreground/80" : "text-muted-foreground/50"}>Proposition participant</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={hasOppositionParticipant ? "text-emerald-400" : "text-muted-foreground/50"}>
                {hasOppositionParticipant ? "✓" : "✗"}
              </span>
              <span className={hasOppositionParticipant ? "text-foreground/80" : "text-muted-foreground/50"}>Opposition participant</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={hasPropositionClaim ? "text-emerald-400" : "text-muted-foreground/50"}>
                {hasPropositionClaim ? "✓" : "✗"}
              </span>
              <span className={hasPropositionClaim ? "text-foreground/80" : "text-muted-foreground/50"}>Proposition claim</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={hasOppositionClaim ? "text-emerald-400" : "text-muted-foreground/50"}>
                {hasOppositionClaim ? "✓" : "✗"}
              </span>
              <span className={hasOppositionClaim ? "text-foreground/80" : "text-muted-foreground/50"}>Opposition claim</span>
            </div>
          </div>
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] text-amber-400">
            Both sides must have at least one participant and one claim before resolution.
          </div>
        </div>
      )}
    </div>
  );
}
