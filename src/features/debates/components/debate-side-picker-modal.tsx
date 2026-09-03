"use client";

import React, { useState, useEffect } from "react";
import { Shield, AlertCircle, Loader2, ArrowRightLeft, X } from "lucide-react";
import { useDebateContext } from "./debate-data-provider";
import { useJoinDebate, useSwitchSide } from "@/features/debates/hooks/use-debates";
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

  const [selectedSide, setSelectedSide] = useState<"proposition" | "opposition" | "neutral">(
    targetSideToJoin || "proposition"
  );
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const joinMutation = useJoinDebate(room.id);
  const switchMutation = useSwitchSide(room.id);

  useEffect(() => {
    if (targetSideToJoin) {
      setSelectedSide(targetSideToJoin);
    }
  }, [targetSideToJoin]);

  if (!isSideModalOpen) return null;

  const isSwitching = !!userParticipation && userParticipation.side !== selectedSide;
  const isPending = joinMutation.isPending || switchMutation.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (userParticipation && userParticipation.side === selectedSide) {
      setIsSideModalOpen(false);
      return;
    }

    if (isSwitching && selectedSide !== "neutral") {
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
        // Switch Side
        if (selectedSide === "neutral") {
          await joinMutation.mutateAsync("neutral");
          toast.success("Updated stance to Neutral Observer");
        } else {
          await switchMutation.mutateAsync({
            newSide: selectedSide,
            reason: reason.trim(),
          });
          toast.success(`Switched stance to ${selectedSide.toUpperCase()}`);
        }
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
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="space-y-1">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span>{userParticipation ? "Switch Stance / Side" : "Select Your Stance"}</span>
          </h2>
          <p className="text-xs text-muted-foreground">
            {userParticipation
              ? "Changing your mind based on evidence is a core truth-seeking action."
              : "Choose a side to participate in structured claim creation."}
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Side Choices */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setSelectedSide("proposition")}
              className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                selectedSide === "proposition"
                  ? "border-blue-500 bg-blue-500/15 ring-2 ring-blue-500/30"
                  : "border-border bg-card/50 hover:bg-muted/40"
              }`}
            >
              <span className="block text-[11px] font-black uppercase text-blue-400">PROPOSITION</span>
              <span className="block text-xs font-semibold text-foreground mt-0.5 leading-tight">
                {debate.propositionTitle || "Supports Motion"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedSide("opposition")}
              className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                selectedSide === "opposition"
                  ? "border-rose-500 bg-rose-500/15 ring-2 ring-rose-500/30"
                  : "border-border bg-card/50 hover:bg-muted/40"
              }`}
            >
              <span className="block text-[11px] font-black uppercase text-rose-400">OPPOSITION</span>
              <span className="block text-xs font-semibold text-foreground mt-0.5 leading-tight">
                {debate.oppositionTitle || "Opposes Motion"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedSide("neutral")}
              className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                selectedSide === "neutral"
                  ? "border-amber-500 bg-amber-500/15 ring-2 ring-amber-500/30"
                  : "border-border bg-card/50 hover:bg-muted/40"
              }`}
            >
              <span className="block text-[11px] font-black uppercase text-amber-400">NEUTRAL</span>
              <span className="block text-xs font-semibold text-foreground mt-0.5 leading-tight">
                Observer Stance
              </span>
            </button>
          </div>

          {/* Mandatory Rationale Field when Switching Stance */}
          {isSwitching && selectedSide !== "neutral" && (
            <div className="space-y-2 pt-2 border-t border-border/50">
              <label className="block text-xs font-bold text-foreground">
                Mandatory Evidence-Based Rationale (Min 50 characters)
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain what evidence, argument, or reasoning convinced you to change your mind..."
                className="w-full rounded-xl border border-input bg-background/50 p-3 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                disabled={isPending}
              />
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-muted-foreground">Logged immutably to side history</span>
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
              disabled={isPending || (isSwitching && selectedSide !== "neutral" && reason.trim().length < 50)}
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
                  <span>{isSwitching ? "Confirm Side Switch" : "Join Stance"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
