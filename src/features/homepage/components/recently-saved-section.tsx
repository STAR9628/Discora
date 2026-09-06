"use client";

import { useState } from "react";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { useRecentlySaved } from "@/features/saves/hooks/use-saves";
import { SavedCard } from "@/features/saves/components/saved-card";
import { unsaveTarget } from "@/features/saves/services/save-service";
import { useAuth } from "@/features/auth/hooks/use-auth";
import type { SavedItem } from "@/features/saves/types";

function LoadingRow() {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-3 animate-pulse space-y-2">
      <div className="h-3 w-1/3 rounded bg-muted" />
      <div className="h-3 w-2/3 rounded bg-muted" />
    </div>
  );
}

export function RecentlySavedSection() {
  const { data: items, isLoading, error, refetch } = useRecentlySaved(5);
  const [unsavingId, setUnsavingId] = useState<string | null>(null);
  const { user } = useAuth();

  if (isLoading) {
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Recently Saved</h2>
          </div>
        </div>
        <div className="space-y-2">
          <LoadingRow />
          <LoadingRow />
          <LoadingRow />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Recently Saved</h2>
          </div>
        </div>
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          Could not load saved items.
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="text-xs font-medium text-primary hover:underline"
        >
          Retry
        </button>
      </section>
    );
  }

  if (!items || items.length === 0) {
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Recently Saved</h2>
          </div>
        </div>
        <div className="rounded-xl border border-dashed border-border bg-card/20 p-6 text-center text-sm text-muted-foreground">
          No saved items yet. Save discussions, debates, claims, and evidence to find them here quickly.
        </div>
      </section>
    );
  }

  const handleUnsave = async (item: SavedItem) => {
    if (!user) return;
    setUnsavingId(item.id);
    try {
      await unsaveTarget(user.id, item.targetType, item.targetId);
      refetch();
    } catch {
      console.error("Failed to unsave");
    } finally {
      setUnsavingId(null);
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bookmark className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Recently Saved</h2>
        </div>
        <Link
          href="/saved"
          className="text-xs font-medium text-primary hover:underline"
        >
          View all
        </Link>
      </div>
      <div className="space-y-2">
        {items.slice(0, 5).map((item: SavedItem) => (
          <SavedCard
            key={item.id}
            item={item}
            onUnsave={() => handleUnsave(item)}
            isUnsaving={unsavingId === item.id}
          />
        ))}
      </div>
    </section>
  );
}
