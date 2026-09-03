"use client";

import { useState } from "react";
import { useSwitchDebateSide } from "@/features/debates/hooks/use-debates";
import { Swords, Shield, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { toast } from "@/components/ui/toast";

interface SideSwitchDialogProps {
  roomId: string;
  currentSide: "proposition" | "opposition";
  isOpen: boolean;
  onClose: () => void;
}

export function SideSwitchDialog({ roomId, currentSide, isOpen, onClose }: SideSwitchDialogProps) {
  const targetSide = currentSide === "proposition" ? "opposition" : "proposition";
  const switchMutation = useSwitchDebateSide(roomId);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSwitch = async () => {
    setError(null);
    const trimmed = reason.trim();
    if (trimmed.length < 50) {
      setError(`Reason must be at least 50 characters (${trimmed.length}/50).`);
      return;
    }

    try {
      await switchMutation.mutateAsync({ newSide: targetSide, reason: trimmed });
      setReason("");
      onClose();
      toast.success("Position changed", {
        description: `You are now ${targetSide === "proposition" ? "supporting" : "challenging"} the motion.`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to switch sides.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl backdrop-blur-xl space-y-5">
        <div className="space-y-1.5">
          <h2 className="text-lg font-extrabold text-foreground">Change Position</h2>
          <p className="text-sm text-muted-foreground">
            Evidence changed your mind? Switch sides and explain why.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 rounded-xl border border-border/60 bg-muted/20 p-4">
          {currentSide === "proposition" ? (
            <span className="flex items-center gap-2 text-sm font-bold text-blue-400">
              <Swords className="h-4 w-4" />
              Support
            </span>
          ) : (
            <span className="flex items-center gap-2 text-sm font-bold text-rose-400">
              <Shield className="h-4 w-4" />
              Challenge
            </span>
          )}
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          {targetSide === "proposition" ? (
            <span className="flex items-center gap-2 text-sm font-bold text-blue-400">
              <Swords className="h-4 w-4" />
              Support
            </span>
          ) : (
            <span className="flex items-center gap-2 text-sm font-bold text-rose-400">
              <Shield className="h-4 w-4" />
              Challenge
            </span>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="switch-reason" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            What changed your mind?
          </label>
          <div className="relative">
            <textarea
              id="switch-reason"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="New evidence, a compelling counter-argument, or a shift in your understanding..."
              className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/10 disabled:opacity-50"
              disabled={switchMutation.isPending}
            />
            <span className={`absolute bottom-3 right-3 text-[10px] font-semibold transition-colors ${
              reason.trim().length >= 50 ? "text-emerald-500" : reason.trim().length > 0 ? "text-destructive" : "text-muted-foreground"
            }`}>
              {reason.trim().length} / 50 min
            </span>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => { setReason(""); setError(null); onClose(); }}
            disabled={switchMutation.isPending}
            className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-accent/40 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSwitch}
            disabled={switchMutation.isPending || reason.trim().length < 50}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground shadow-md transition-all hover:opacity-90 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            {switchMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Switching...</span>
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4" />
                <span>Switch to {targetSide === "proposition" ? "Support" : "Challenge"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
