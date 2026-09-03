"use client";

import { Swords, Shield, Eye } from "lucide-react";

interface DebateSideSelectorProps {
  selectedSide: "proposition" | "opposition" | null;
  onSelect: (side: "proposition" | "opposition") => void;
  userSide?: "proposition" | "opposition" | "neutral" | null;
  disabled?: boolean;
}

export function DebateSideSelector({ selectedSide, onSelect, userSide, disabled }: DebateSideSelectorProps) {
  if (!userSide || userSide === "neutral") return null;

  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
        Claim Side
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSelect("proposition")}
          disabled={disabled || userSide === "opposition"}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-bold transition-all cursor-pointer ${
            selectedSide === "proposition"
              ? "border-blue-500/50 bg-blue-500/10 text-blue-400"
              : userSide === "opposition"
              ? "border-border/30 bg-muted/20 text-muted-foreground/50 cursor-not-allowed"
              : "border-border bg-card/40 text-muted-foreground hover:border-blue-500/30 hover:bg-blue-500/5"
          }`}
        >
          <Swords className="h-4 w-4" />
          Proposition
        </button>

        <button
          type="button"
          onClick={() => onSelect("opposition")}
          disabled={disabled || userSide === "proposition"}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-bold transition-all cursor-pointer ${
            selectedSide === "opposition"
              ? "border-rose-500/50 bg-rose-500/10 text-rose-400"
              : userSide === "proposition"
              ? "border-border/30 bg-muted/20 text-muted-foreground/50 cursor-not-allowed"
              : "border-border bg-card/40 text-muted-foreground hover:border-rose-500/30 hover:bg-rose-500/5"
          }`}
        >
          <Shield className="h-4 w-4" />
          Opposition
        </button>
      </div>
      {selectedSide && selectedSide !== userSide && (
        <p className="text-[10px] text-amber-500 flex items-center gap-1">
          <Eye className="h-3 w-3" />
          You are on the {userSide} side. Select your own side to contribute.
        </p>
      )}
    </div>
  );
}
