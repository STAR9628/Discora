"use client";

import React, { useState, useEffect } from "react";
import { Shield, AlertCircle, Loader2, ArrowRightLeft, X, Info } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useDebateContext } from "./debate-data-provider";
import { useJoinDebate, useSwitchSide } from "@/features/debates/hooks/use-debates";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { toast } from "@/components/ui/toast";

export function DebateSidePickerModal() {
  const {
    room,
    debate,
    userParticipation,
    isSideModalOpen,
    setIsSideModalOpen,
    targetSideToJoin,
    setTargetSideToJoin,
  } = useDebateContext();

  const [selectedSide, setSelectedSide] = useState<"proposition" | "opposition">(
    targetSideToJoin === "opposition" ? "opposition" : "proposition"
  );
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const joinMutation = useJoinDebate(room.id);
  const switchMutation = useSwitchSide(room.id);

  useEffect(() => {
    if (targetSideToJoin === "proposition" || targetSideToJoin === "opposition") {
      setSelectedSide(targetSideToJoin);
    }
  }, [targetSideToJoin]);

  if (!isSideModalOpen) return null;

  const isSwitching = !!userParticipation && userParticipation.side !== selectedSide;
  const isPending = joinMutation.isPending || switchMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Guest: redirect to registration instead of calling mutation
    if (!user) {
      setIsSideModalOpen(false);
      router.push(`/register?redirectedFrom=${encodeURIComponent(pathname ?? "/")}`);
      return;
    }

    if (userParticipation && userParticipation.side === selectedSide) {
      setIsSideModalOpen(false);
      return;
    }

    if (isSwitching) {
      const trimmed = reason.trim();
      if (trimmed.length < 50) {
        setError("Mandatory rationale must be at least 50 characters explaining why you are changing your stance based on evidence.");
        return;
      }
    }

    try {
      if (!userParticipation) {
        // Initial Join
        await joinMutation.mutateAsync(selectedSide);
        toast.success(`Joined debate as ${selectedSide.toUpperCase()}`);
      } else {
        // Switch Side (enforcing 50-char rationale and 24h cooldown in switch_debate_side RPC)
        await switchMutation.mutateAsync({
          newSide: selectedSide,
          reason: reason.trim(),
        });
        toast.success(`Switched stance to ${selectedSide.toUpperCase()}`);
      }
      setIsSideModalOpen(false);
      setReason("");
      setTargetSideToJoin(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update debate stance.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5">
        <button
          type="button"
          onClick={() => setIsSideModalOpen(false)}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer p-1"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* P1.4 Welcoming, progressively disclosed modal header */}
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span>{userParticipation ? "Change Your Position" : "Choose Your Stance"}</span>
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {userParticipation
              ? "In Discora, updating your position based on new evidence is recognized as a truth-seeking virtue."
              : "Select a position to contribute from. You can update your stance as new arguments and evidence develop."}
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Side Choices: Bilateral Proposition vs Opposition */}
          <div className="grid grid-cols-1 gap-2.5">
            <button
              type="button"
              onClick={() => setSelectedSide("proposition")}
              className={`rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                selectedSide === "proposition"
                  ? "border-blue-500 bg-blue-500/15 ring-2 ring-blue-500/30"
                  : "border-border bg-card/50 hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-blue-400">PROPOSITION</span>
                <span className="text-[10px] text-muted-foreground">Affirmative position</span>
              </div>
              <span className="block text-xs font-bold text-foreground mt-1 leading-tight">
                {debate.propositionTitle || "Supports Motion"}
              </span>
              <p className="text-[11px] text-muted-foreground mt-1">
                Contribute claims and evidence that support this thesis.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedSide("opposition")}
              className={`rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                selectedSide === "opposition"
                  ? "border-rose-500 bg-rose-500/15 ring-2 ring-rose-500/30"
                  : "border-border bg-card/50 hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-rose-400">OPPOSITION</span>
                <span className="text-[10px] text-muted-foreground">Counter position</span>
              </div>
              <span className="block text-xs font-bold text-foreground mt-1 leading-tight">
                {debate.oppositionTitle || "Opposes Motion"}
              </span>
              <p className="text-[11px] text-muted-foreground mt-1">
                Contribute claims and evidence that challenge this thesis.
              </p>
            </button>
          </div>

          {/* Progressive Context for First-Time Joiners */}
          {!userParticipation && (
            <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
              <Info className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>You can update your position at any time as new evidence is evaluated.</span>
            </div>
          )}

          {/* Contextual Rationale Field strictly when Switching Stance */}
          {isSwitching && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-foreground">
                  What convinced you to change your mind? (Min 50 characters)
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Explain the evidence, argument, or line of reasoning that prompted your change of perspective. This is recorded in the debate&apos;s position history.
                </p>
              </div>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe what evidence or counter-argument changed your position..."
                className="w-full rounded-xl border border-input bg-background/50 p-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                disabled={isPending}
              />
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-muted-foreground">Positions have a 24-hour cooldown after switching</span>
                <span className={reason.trim().length < 50 ? "text-amber-400 font-bold" : "text-emerald-400 font-bold"}>
                  {reason.trim().length} / 50 min
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsSideModalOpen(false)}
              className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || (isSwitching && reason.trim().length < 50)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-xs font-bold text-primary-foreground shadow-md hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  <span>{isSwitching ? "Confirm Position Change" : "Join Debate Stance"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
