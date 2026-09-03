"use client";

import React from "react";
import { Swords, CheckCircle2, AlertCircle, Shield, ArrowRightLeft, FileText } from "lucide-react";
import { useDebateContext } from "./debate-data-provider";

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
  } = useDebateContext();

  const isResolved = debate.status === "resolved";
  const winnerStr = typeof debate.resolution?.winner === "string" ? debate.resolution.winner : null;

  return (
    <div className="rounded-2xl border border-border/80 bg-card/60 p-5 md:p-6 backdrop-blur-md shadow-lg space-y-4">
      {/* Top Meta Line: Badges & Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-400 border border-amber-500/30">
            <Swords className="h-3.5 w-3.5" />
            Debate
          </span>
          {topic && (
            <span className="inline-flex rounded-full bg-muted/50 px-3 py-0.5 text-[11px] font-bold text-muted-foreground border border-border/50">
              {topic.name}
            </span>
          )}
          {isResolved ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Resolved {winnerStr ? `(${winnerStr.toUpperCase()})` : ""}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-blue-400 border border-blue-500/30">
              <AlertCircle className="h-3.5 w-3.5" />
              Active Debate
            </span>
          )}
        </div>

        {/* User Participation Badge / CTA */}
        <div className="flex items-center gap-2">
          {userParticipation ? (
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-bold border ${
                userParticipation.side === "proposition"
                  ? "bg-blue-500/15 border-blue-500/30 text-blue-400"
                  : userParticipation.side === "opposition"
                  ? "bg-rose-500/15 border-rose-500/30 text-rose-400"
                  : "bg-muted/60 border-border text-muted-foreground"
              }`}>
                <Shield className="h-3.5 w-3.5" />
                Stance: {userParticipation.side === "proposition" ? "Proposition" : userParticipation.side === "opposition" ? "Opposition" : "Neutral Observer"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setTargetSideToJoin(userParticipation.side === "proposition" ? "opposition" : "proposition");
                  setIsSideModalOpen(true);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-border bg-card hover:bg-muted/50 px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                title="Switch side with mandatory rationale"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
                <span>Switch</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setTargetSideToJoin("proposition");
                setIsSideModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-sm hover:opacity-90 transition-all cursor-pointer"
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Join Debate</span>
            </button>
          )}
        </div>
      </div>

      {/* Motion Title */}
      <div>
        <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-foreground leading-tight">
          {room.title}
        </h1>
      </div>

      {/* Two Positions Comparison Cards (Proposition vs Opposition) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* Proposition Card */}
        <div className={`rounded-xl border p-3.5 transition-all ${
          isResolved && winnerStr === "proposition"
            ? "border-emerald-500/40 bg-emerald-500/5 ring-1 ring-emerald-500/30"
            : "border-blue-500/30 bg-blue-500/5"
        }`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-400" />
              PROPOSITION
            </span>
            <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {propositionClaims.length} Claims
            </span>
          </div>
          <p className="text-xs md:text-sm font-semibold text-foreground/90 leading-snug">
            {debate.propositionTitle || "Supports the motion"}
          </p>
        </div>

        {/* Opposition Card */}
        <div className={`rounded-xl border p-3.5 transition-all ${
          isResolved && winnerStr === "opposition"
            ? "border-emerald-500/40 bg-emerald-500/5 ring-1 ring-emerald-500/30"
            : "border-rose-500/30 bg-rose-500/5"
        }`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              OPPOSITION
            </span>
            <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {oppositionClaims.length} Claims
            </span>
          </div>
          <p className="text-xs md:text-sm font-semibold text-foreground/90 leading-snug">
            {debate.oppositionTitle || "Opposes the motion"}
          </p>
        </div>
      </div>
    </div>
  );
}
