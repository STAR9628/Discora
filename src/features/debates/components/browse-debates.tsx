"use client";

import Link from "next/link";
import { useState } from "react";
import { useDebates } from "@/features/debates/hooks/use-debates";
import { Swords, Plus, Calendar, Users, FileText, Trophy, Clock, Loader2 } from "lucide-react";
import { formatDate } from "@/lib/date";
import type { DebateSortOption, DebateFeedItem } from "@/features/debates/services/debate-service";

export function BrowseDebates() {
  const [statusFilter, setStatusFilter] = useState<"active" | "resolved" | "closing_soon">("active");
  const [sort, setSort] = useState<DebateSortOption>("most_active");

  const { items: debates, isLoading, error, hasMore, isLoadingMore, loadMore } = useDebates(statusFilter, sort);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Browse Debates
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Active structured debates with proposition and opposition sides.
          </p>
        </div>
        <Link
          href="/debates/create"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-400 shadow-md transition-all hover:opacity-90 hover:scale-[1.02]"
        >
          <Plus className="h-4 w-4" />
          <span>New Debate</span>
        </Link>
      </div>

      {/* Status filter */}
      <div className="flex gap-2">
        {(["active", "closing_soon", "resolved"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium border transition-all cursor-pointer ${
              statusFilter === status
                ? "bg-primary border-primary text-primary-foreground shadow-sm"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {status === "active" ? "Active" : status === "closing_soon" ? "Closing Soon" : "Resolved"}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-semibold uppercase tracking-wider">Sort by:</span>
        {(["most_active", "most_evidence", "most_participants", "newest"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`rounded-lg px-3 py-1 text-xs font-semibold border transition-all cursor-pointer ${
              sort === s
                ? "border-primary/40 bg-primary/5 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {s === "most_active" ? "Most Active" : s === "most_evidence" ? "Most Evidence" : s === "most_participants" ? "Most Participants" : "Newest"}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-36 rounded-2xl border border-border bg-card/20 p-6 animate-pulse space-y-4">
              <div className="h-6 w-2/3 bg-muted rounded" />
              <div className="h-4 w-1/3 bg-muted rounded" />
              <div className="h-12 w-full bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center text-destructive">
          <p className="font-semibold">Unable to load debates.</p>
          <p className="text-xs text-muted-foreground mt-1">{(error as Error).message}</p>
        </div>
      ) : !debates || debates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/20 p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="mx-auto rounded-full bg-muted/40 p-4 w-fit text-muted-foreground">
            <Swords className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold">No debates found</h3>
            <p className="text-sm text-muted-foreground mt-1.5">
              Be the first to launch a structured debate!
            </p>
          </div>
          <Link
            href="/debates/create"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:opacity-95 hover:scale-[1.02]"
          >
            <Swords className="h-4 w-4" />
            <span>Launch the First Debate</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {debates.map(({ room, debate }: DebateFeedItem) => (
            <article
              key={room.id}
              className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card/45 p-6 backdrop-blur-sm shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-border"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 border border-amber-500/30">
                    Debate
                  </span>
                  {debate.status === "resolved" && (
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <Trophy className="h-3 w-3" />
                      Resolved
                    </span>
                  )}
                  {debate.status === "active" && (
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/30">
                      Active
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{formatDate(room.createdAt, { month: "short", day: "numeric", year: "numeric" })}</span>
                  </span>
                </div>

                <h2 className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                  <Link href={`/debates/${room.slug}`} className="outline-none focus:underline">
                    {room.title}
                  </Link>
                </h2>

                {room.description && (
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                    {room.description}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 space-y-1">
                    <span className="font-extrabold text-blue-400 uppercase tracking-wider text-[9px]">Proposition</span>
                    <p className="text-[10px] text-muted-foreground/60 italic leading-relaxed">
                      &ldquo;{room.title}&rdquo;
                    </p>
                    <p className="font-semibold text-blue-400">Supports the motion</p>
                  </div>
                  <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 space-y-1">
                    <span className="font-extrabold text-rose-400 uppercase tracking-wider text-[9px]">Opposition</span>
                    <p className="text-[10px] text-muted-foreground/60 italic leading-relaxed">
                      &ldquo;{room.title}&rdquo;
                    </p>
                    <p className="font-semibold text-rose-400">Challenges the motion</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    {debate.propositionClaimCount + debate.oppositionClaimCount} claims
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {debate.propositionParticipantCount + debate.oppositionParticipantCount + debate.neutralParticipantCount} participants
                  </span>
                  {debate.status === "resolved" && debate.resolution && (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Trophy className="h-3.5 w-3.5" />
                      {(debate.resolution as { winner: string }).winner === "draw"
                        ? "Draw"
                        : `${(debate.resolution as { winner: string }).winner === "proposition" ? "Proposition" : "Opposition"} wins`}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-border/40 flex justify-end">
                <Link
                  href={`/debates/${room.slug}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 group-hover:text-amber-300 transition-colors"
                >
                  <span>Join Debate</span>
                  <Clock className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </article>
          ))}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={loadMore}
                disabled={isLoadingMore}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/40 px-6 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5" />}
                <span>{isLoadingMore ? "Loading..." : "Load More"}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
