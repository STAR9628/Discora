"use client";

import Link from "next/link";
import { MessageSquare, Swords, Link2, X, Loader2 } from "lucide-react";
import type { SavedItem } from "../types";

interface SavedCardProps {
  item: SavedItem;
  onUnsave: () => void;
  isUnsaving?: boolean;
}

const iconMap = {
  discussion: MessageSquare,
  debate: Swords,
  claim: Link2,
  evidence: Link2,
};

const labelMap = {
  discussion: "Discussion",
  debate: "Debate",
  claim: "Claim",
  evidence: "Evidence",
};

export function SavedCard({ item, onUnsave, isUnsaving }: SavedCardProps) {
  const Icon = iconMap[item.targetType];
  const label = labelMap[item.targetType];
  const basePath = item.roomType === "debate" ? "/debates" : "/discussions";
  const section =
    item.targetType === "claim"
      ? item.roomType === "debate"
        ? "arguments"
        : "claims"
      : item.targetType === "evidence"
        ? "evidence"
        : null;
  const href = item.slug ? (section ? `${basePath}/${item.slug}/${section}` : `${basePath}/${item.slug}`) : "#";

  return (
    <div className="group flex items-center justify-between gap-4 rounded-xl border border-border bg-card/40 px-4 py-3 transition-colors hover:border-primary/30 hover:bg-card/60">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="font-medium">{label}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">{item.roomTitle}</span>
        </div>
        <p className="mt-1 text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {item.title}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Saved {new Date(item.createdAt).toLocaleDateString()}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href={href}
          className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15 transition-colors"
        >
          View
        </Link>
        <button
          type="button"
          onClick={onUnsave}
          disabled={isUnsaving}
          aria-label="Remove from saved"
          title="Remove from saved"
          className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors cursor-pointer disabled:opacity-50"
        >
          {isUnsaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <X className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
