"use client";

import { useState } from "react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useJoinDebate, useLeaveDebate, useDebateParticipants, useSideChangeHistory } from "@/features/debates/hooks/use-debates";
import type { Debate } from "@/features/discussions/types";
import { Swords, Shield, Eye, Loader2, LogOut, ArrowRight, Clock } from "lucide-react";
import { SideSwitchDialog } from "./side-switch-dialog";

interface DebateSidePickerProps {
  roomId: string;
  debate: Debate;
}

export function DebateSidePicker({ roomId, debate }: DebateSidePickerProps) {
  const { user } = useAuth();
  const joinMutation = useJoinDebate(roomId);
  const leaveMutation = useLeaveDebate(roomId);
  const { data: participants } = useDebateParticipants(roomId);
  const { data: sideChanges } = useSideChangeHistory(roomId, user?.id);
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);

  const userParticipation = participants?.find((p) => p.userId === user?.id);
  const isResolved = debate.status === "resolved" || debate.status === "closed";

  const latestChange = sideChanges && sideChanges.length > 0 ? sideChanges[0] : null;
  const cooldownEnd = latestChange ? new Date(new Date(latestChange.createdAt).getTime() + 24 * 60 * 60 * 1000) : null;
  const now = new Date();
  const cooldownRemaining = cooldownEnd ? Math.max(0, Math.ceil((cooldownEnd.getTime() - now.getTime()) / (1000 * 60 * 60))) : 0;
  const isOnCooldown = cooldownRemaining > 0;

  if (!user) return null;
  if (isResolved) return null;

  const handleJoin = async (side: "proposition" | "opposition") => {
    try {
      await joinMutation.mutateAsync(side);
    } catch {
      // handled by react-query
    }
  };

  const handleLeave = async () => {
    try {
      await leaveMutation.mutateAsync();
    } catch {
      // handled by react-query
    }
  };

  const isLoading = joinMutation.isPending || leaveMutation.isPending;

  if (userParticipation) {
    return (
      <>
        <div className="rounded-2xl border border-border bg-card/30 p-4 shadow-sm backdrop-blur-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {userParticipation.side === "proposition" ? (
                <Swords className="h-4 w-4 text-blue-400" />
              ) : userParticipation.side === "opposition" ? (
                <Shield className="h-4 w-4 text-rose-400" />
              ) : (
                <Eye className="h-4 w-4 text-slate-400" />
              )}
              <span className="text-xs font-bold text-foreground">
                {userParticipation.side === "proposition"
                  ? "Supporting this motion"
                  : userParticipation.side === "opposition"
                  ? "Challenging this motion"
                  : "Observing"}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLeave}
              disabled={isLoading}
              className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
            >
              {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}
              <span>Leave</span>
            </button>
          </div>

          {userParticipation.side !== "neutral" && (
            <div className="border-t border-border/40 pt-3 space-y-2">
              {isOnCooldown ? (
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                  <span className="text-[11px] font-medium text-amber-400/90">
                    Cooldown — {cooldownRemaining}h remaining
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSwitchDialog(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs font-bold text-amber-400 transition-all hover:bg-amber-500/10 cursor-pointer"
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                  <span>Change Position</span>
                </button>
              )}
            </div>
          )}
        </div>

        <SideSwitchDialog
          roomId={roomId}
          currentSide={userParticipation.side as "proposition" | "opposition"}
          isOpen={showSwitchDialog}
          onClose={() => setShowSwitchDialog(false)}
        />
      </>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card/30 p-4 shadow-sm backdrop-blur-sm space-y-3">
      <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">
        Choose Your Side
      </h3>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleJoin("proposition")}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/5 p-3 text-xs font-bold text-blue-400 transition-all hover:bg-blue-500/10 cursor-pointer disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Swords className="h-4 w-4" />}
          <span>Support the Motion</span>
        </button>
        <button
          type="button"
          onClick={() => handleJoin("opposition")}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3 text-xs font-bold text-rose-400 transition-all hover:bg-rose-500/10 cursor-pointer disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Shield className="h-4 w-4" />}
          <span>Challenge the Motion</span>
        </button>
      </div>
    </div>
  );
}
