"use client";

import React from "react";
import { Swords, Shield, ArrowRightLeft, FileText } from "lucide-react";
import { useDebateContext, normalizeDebateLens } from "./debate-data-provider";
import { SaveButton } from "@/features/saves/components/save-button";
import { ShareButton } from "@/components/share/share-button";
import { DebateDeadlineLine } from "./debate-deadline";

export function DebateHeaderV2() {
  const {
    room,
    topic,
    debate,
    userParticipation,
    setIsSideModalOpen,
    setTargetSideToJoin,
    propositionClaims,
    oppositionClaims,
    activeSection,
  } = useDebateContext();

  const currentLens = normalizeDebateLens(activeSection);

  return (
    <div className="rounded-2xl border border-border/70 bg-card/40 p-3 sm:p-4 md:p-5 backdrop-blur-md shadow-sm space-y-2 sm:space-y-3">
      {/* Top: Room Identity + Stance Actions */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 sm:gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold tracking-tight text-foreground break-words leading-snug">
            {room.title}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-400 border border-amber-500/30">
              <Swords className="h-3 w-3" />
              DEBATE
            </span>
            {room.status === "archived" && (
              <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-destructive border border-destructive/20">
                Archived
              </span>
            )}
            {room.isEdited && (
              <span className="inline-flex rounded-md bg-muted/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground border border-border/40">
                Edited
              </span>
            )}
            {topic && (
              <span className="inline-flex rounded-md bg-muted/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground border border-border/40">
                {topic.name}
              </span>
            )}
            <DebateDeadlineLine />
          </div>
          {/* Creator-entered Room Description — Always visible near the top */}
          {room.description && (
            <p className="mt-1.5 max-w-4xl text-xs sm:text-sm leading-relaxed text-foreground/80 font-normal">
              {room.description}
            </p>
          )}
        </div>

        {/* User Participation Badge / CTA + Save Button */}
        <div className="flex items-center gap-2 shrink-0 pt-0.5">
          {userParticipation ? (
            <div className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold border ${
                  userParticipation.side === "proposition"
                    ? "bg-blue-500/15 border-blue-500/30 text-blue-400"
                    : userParticipation.side === "opposition"
                    ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
                    : "bg-muted/60 border-border text-muted-foreground"
                }`}
              >
                <Shield className="h-3.5 w-3.5" />
                <span>{userParticipation.side === "proposition" ? "Proposition" : userParticipation.side === "opposition" ? "Opposition" : "Observer"}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setTargetSideToJoin(userParticipation.side === "proposition" ? "opposition" : "proposition");
                  setIsSideModalOpen(true);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-card/60 hover:bg-card/90 px-2 py-1 min-h-[36px] sm:min-h-0 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-xs"
                title="Switch side with mandatory rationale"
              >
                <ArrowRightLeft className="h-3 w-3" />
                <span className="hidden sm:inline">Switch</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setTargetSideToJoin("proposition");
                setIsSideModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 min-h-[38px] sm:min-h-0 text-xs font-bold text-primary-foreground shadow-xs hover:opacity-90 transition-all cursor-pointer"
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Join Debate</span>
            </button>
          )}

          <SaveButton targetType="debate" targetId={room.id} showLabel={false} />
          {room.visibility === "public" && (
            <ShareButton
              ariaLabel="Share this debate"
              shareTitle={room.title}
              shareText="I think this debate would be interesting to discuss together."
              sharePath={`/debates/${room.slug}`}
              showLabel={false}
            />
          )}
        </div>
      </div>

      {/* Two Positions Context: In Conversation view, sleek compact 1-line strip; In other lenses, 2-column cards */}
      {currentLens === "conversation" ? (
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1.5 border-t border-border/30">
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground/85 text-[11px] sm:text-xs">
            <span className="h-2 w-2 rounded-full bg-blue-400 shrink-0" />
            <strong className="text-blue-400 font-bold uppercase text-[10px] sm:text-xs">Proposition:</strong> {debate.propositionTitle || "Supports the motion"}
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground/85 text-[11px] sm:text-xs">
            <span className="h-2 w-2 rounded-full bg-rose-400 shrink-0" />
            <strong className="text-rose-400 font-bold uppercase text-[10px] sm:text-xs">Opposition:</strong> {debate.oppositionTitle || "Challenges the motion"}
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-border/30">
          {/* Proposition Card */}
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-3.5 transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-400" />
                PROPOSITION
              </span>
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                {propositionClaims.length} Claims
              </span>
            </div>
            <p className="text-xs md:text-sm font-semibold text-foreground/90 leading-snug">
              {debate.propositionTitle || "Supports the motion"}
            </p>
          </div>

          {/* Opposition Card */}
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3.5 transition-all">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                OPPOSITION
              </span>
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                {oppositionClaims.length} Claims
              </span>
            </div>
            <p className="text-xs md:text-sm font-semibold text-foreground/90 leading-snug">
              {debate.oppositionTitle || "Challenges the motion"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
