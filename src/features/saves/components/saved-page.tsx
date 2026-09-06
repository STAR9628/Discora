"use client";

import { useState } from "react";
import Link from "next/link";
import { Bookmark, MessageSquare, Swords } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useSavedList } from "../hooks/use-saves";
import { unsaveTarget } from "../services/save-service";
import { SavedCard } from "./saved-card";
import type { SaveTargetType } from "../types";

const FILTERS: { id: SaveTargetType | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "discussion", label: "Discussions" },
  { id: "debate", label: "Debates" },
  { id: "claim", label: "Claims" },
  { id: "evidence", label: "Evidence" },
];

function LoadingCard() {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4 animate-pulse space-y-3">
      <div className="h-4 w-3/4 rounded bg-muted" />
      <div className="h-3 w-1/2 rounded bg-muted" />
    </div>
  );
}

export function SavedPageClient() {
  const { user, status } = useAuth();
  const [filter, setFilter] = useState<SaveTargetType | "all">("all");
  const [unsavingId, setUnsavingId] = useState<string | null>(null);

  const targetType = filter === "all" ? undefined : filter;
  const { data, isLoading, error, refetch } = useSavedList({ targetType, limit: 20 });

  const items = data?.items ?? [];

  const handleUnsave = async (itemId: string, targetType: SaveTargetType, targetId: string) => {
    setUnsavingId(itemId);
    try {
      await unsaveTarget(user!.id, targetType, targetId);
      refetch();
    } catch {
      console.error("Failed to unsave");
    } finally {
      setUnsavingId(null);
    }
  };

  if (status !== "authenticated" || !user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Please sign in to view your saved items.
        </p>
        <Link
          href={`/login?redirectedFrom=${encodeURIComponent("/saved")}`}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Saved</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your saved discussions, debates, claims, and evidence.
        </p>
      </div>

      <div className="mb-6 flex items-center gap-1 overflow-x-auto border-b border-border/40 pb-1">
        {FILTERS.map((f) => {
          const isActive = filter === f.id;
          const count = f.id === "all" ? items.length : items.filter((i) => i.targetType === f.id).length;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card border border-border/60 text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <span>{f.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <LoadingCard />
          <LoadingCard />
          <LoadingCard />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center">
          <p className="text-sm font-medium text-destructive">
            {error.message || "Failed to load saved items."}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent"
          >
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/20 p-12 text-center">
          <Bookmark className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <h3 className="mt-4 text-sm font-semibold text-foreground">No saved items yet</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Save discussions, debates, claims, and evidence to find them here quickly.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Link
              href="/discussions"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Browse Discussions
            </Link>
            <Link
              href="/debates"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground hover:bg-accent"
            >
              <Swords className="h-3.5 w-3.5" />
              Browse Debates
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <SavedCard
              key={item.id}
              item={item}
              onUnsave={() => handleUnsave(item.id, item.targetType, item.targetId)}
              isUnsaving={unsavingId === item.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
