import { Shield } from "lucide-react";
import type { ClaimCredibility } from "../types";
import { computeClaimCredibilityLabel } from "../reputation-utils";

interface ClaimCredibilityBadgeProps {
  credibility: ClaimCredibility;
  showScore?: boolean;
  size?: "sm" | "md";
}

export function ClaimCredibilityBadge({ credibility, showScore, size = "sm" }: ClaimCredibilityBadgeProps) {
  const label = computeClaimCredibilityLabel(credibility.score);
  const colorMap = {
    high: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    low: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  const colorClass = colorMap[credibility.level];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border font-medium ${size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs"} ${colorClass}`}
    >
      <Shield className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
      {label}
      {showScore && <span className="opacity-70">({credibility.score})</span>}
    </span>
  );
}
