"use client";

import Link from "next/link";
import { Compass, MessageSquare, Swords } from "lucide-react";
import { useRecentlyEngaged } from "../hooks/use-recently-engaged";
import type { RecentEngagement } from "../hooks/use-recently-engaged";

function LoadingRow() {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-3 animate-pulse space-y-2">
      <div className="h-3 w-1/3 rounded bg-muted" />
      <div className="h-3 w-2/3 rounded bg-muted" />
    </div>
  );
}

export function RecentlyEngagedSection() {
  const { data: items, isLoading, error, refetch } = useRecentlyEngaged(5);

  if (isLoading) {
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Recently Engaged</h2>
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
            <Compass className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Recently Engaged</h2>
          </div>
        </div>
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          Could not load recent activity.
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
            <Compass className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Recently Engaged</h2>
          </div>
        </div>
        <div className="rounded-xl border border-dashed border-border bg-card/20 p-6 text-center text-sm text-muted-foreground">
          You haven&apos;t engaged with any rooms yet. Start by joining a discussion or debate.
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Recently Engaged</h2>
        </div>
      </div>
      <div className="space-y-2">
        {items.slice(0, 5).map((item: RecentEngagement) => {
          const href =
            item.roomType === "debate"
              ? `/debates/${item.roomSlug}`
              : `/discussions/${item.roomSlug}`;

          return (
            <Link
              key={`${item.roomId}-${item.lastEngagedAt}`}
              href={href}
              className="group flex flex-col gap-1 rounded-xl border border-border bg-card/40 p-3 transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-border/80"
            >
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2 min-w-0">
                  {item.roomType === "debate" ? (
                    <Swords className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                  ) : (
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                  )}
                  <span className="truncate font-medium text-foreground/80">{item.roomTitle}</span>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {new Date(item.lastEngagedAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground italic">{item.engagementDetail}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
