"use client";

import Link from "next/link";
import { useState } from "react";
import { useTopics, useInfiniteDiscussions } from "@/features/discussions/hooks/use-discussions";
import { MessageSquare, Calendar, SlidersHorizontal, Plus, Loader2, Sparkles, ArrowRight, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/date";
import { Button } from "@/components/ui/button";

export function DiscussionFeed() {
  const [selectedTopicId, setSelectedTopicId] = useState<string | undefined>(undefined);
  const { data: topics, isLoading: isTopicsLoading, error: topicsError } = useTopics();
  const {
    data: feedData,
    isLoading: isFeedLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error: feedError,
  } = useInfiniteDiscussions(selectedTopicId, 10);

  const discussions = feedData?.pages.flatMap((page) => page) || [];

  return (
    <div className="space-y-8">
      {/* Feed Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Explore Discussions
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Open-exploration conversations with many viewpoints and no winner. Share perspectives and evidence.
          </p>
        </div>
        <div className="flex shrink-0">
          <Button asChild size="default" className="rounded-xl font-semibold shadow-xs">
            <Link href="/discussions/create">
              <Plus className="h-4 w-4" />
              <span>New Discussion</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Topic Filter Pills — Compact horizontal topic rail on mobile, wrapping on desktop */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>Filter by Topic</span>
        </div>

        {topicsError ? (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="font-medium">Unable to load topics.</span>
          </div>
        ) : isTopicsLoading ? (
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-8 w-20 shrink-0 rounded-full bg-muted/30 border border-border/50" />
            ))}
          </div>
        ) : (
          <div className="relative">
            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth overscroll-x-contain touch-pan-x py-1 pr-8 sm:pr-0 sm:flex-wrap [mask-image:linear-gradient(to_right,black_0%,black_calc(100%-2rem),transparent_100%)] sm:[mask-image:none]">
              <button
                type="button"
                onClick={() => setSelectedTopicId(undefined)}
                className={`rounded-full px-3.5 py-1.5 min-h-[34px] sm:min-h-0 text-xs font-semibold border transition-all duration-150 active:scale-[0.96] cursor-pointer shrink-0 select-none ${
                  selectedTopicId === undefined
                    ? "bg-primary border-primary text-primary-foreground shadow-xs"
                    : "bg-card/60 border-border/70 text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                All Topics
              </button>
              {topics?.map((topic) => {
                const isSelected = selectedTopicId === topic.id;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => setSelectedTopicId(topic.id)}
                    className={`rounded-full px-3.5 py-1.5 min-h-[34px] sm:min-h-0 text-xs font-semibold border transition-all duration-150 active:scale-[0.96] cursor-pointer shrink-0 select-none ${
                      isSelected
                        ? "bg-primary border-primary text-primary-foreground shadow-xs"
                        : "bg-card/60 border-border/70 text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  >
                    {topic.name}
                  </button>
                );
              })}
            </div>
            <div
              className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent sm:hidden"
              aria-hidden="true"
            />
          </div>
        )}
      </div>

      {/* Feed Content */}
      {isFeedLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-44 rounded-2xl border border-border bg-card/20 p-6 animate-pulse space-y-4">
              <div className="h-6 w-2/3 bg-muted rounded" />
              <div className="h-4 w-1/3 bg-muted rounded" />
              <div className="h-16 w-full bg-muted rounded" />
            </div>
          ))}
        </div>
      ) : feedError ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center text-destructive">
          <p className="font-semibold">Unable to load discussions feed.</p>
          <p className="text-xs text-muted-foreground mt-1">{(feedError as Error).message}</p>
        </div>
      ) : discussions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/20 p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="mx-auto rounded-full bg-muted/40 p-4 w-fit text-muted-foreground">
            <MessageSquare className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold">No discussions found</h3>
            <p className="text-sm text-muted-foreground mt-1.5">
              Be the first to launch an open discussion under this category!
            </p>
          </div>
          <Link
            href="/discussions/create"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:opacity-95 hover:scale-[1.02]"
          >
            <Sparkles className="h-4 w-4" />
            <span>Launch the First Discussion</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {discussions.map(({ room, topic, discussion, debate }) => {
            const isDebate = room.roomType === "debate";
            const hasSummary = !isDebate && !!discussion?.summary;
            const previewText = isDebate
              ? debate?.openingStatement
                ? debate.openingStatement.length > 180
                  ? `${debate.openingStatement.slice(0, 180)}...`
                  : debate.openingStatement
                : ""
              : hasSummary
              ? discussion!.summary
              : discussion?.openingStatement
              ? discussion.openingStatement.length > 180
                ? `${discussion.openingStatement.slice(0, 180)}...`
                : discussion.openingStatement
              : "";

            return (
              <article
                key={room.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-border/70 bg-card/40 p-4 sm:p-6 backdrop-blur-sm shadow-xs transition-all duration-200 hover:border-border hover:bg-card/70"
              >
                <div className="space-y-2 sm:space-y-3">
                  {/* Topic and date tags */}
                  <div className="flex flex-wrap items-center gap-2">
                    {isDebate && (
                      <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400 border border-amber-500/30">
                        Debate
                      </span>
                    )}
                    {topic && (
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                        {topic.name}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <span>{formatDate(room.createdAt, {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                      })}</span>
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-base sm:text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors leading-snug">
                    <Link href={isDebate ? `/debates/${room.slug}` : `/discussions/${room.slug}`} className="outline-none focus:underline">
                      {room.title}
                    </Link>
                  </h2>

                  {/* Optional sub-description */}
                  {room.description && (
                    <p className="text-xs text-muted-foreground font-medium leading-relaxed">
                      {room.description}
                    </p>
                  )}

                  {/* Preview of Summary / Opening Statement */}
                  {previewText && (
                    <div className={`p-2.5 sm:p-3.5 rounded-xl text-xs sm:text-sm leading-relaxed border ${
                      hasSummary 
                        ? "bg-primary/[0.02] border-primary/10 text-foreground/90 font-medium italic quotes" 
                        : "bg-muted/15 border-border/50 text-muted-foreground"
                    }`}>
                      {hasSummary && (
                        <span className="text-[10px] sm:text-[11px] not-italic uppercase tracking-wide font-bold block text-primary/75 mb-0.5">
                          Summary
                        </span>
                      )}
                      <p>{previewText}</p>
                    </div>
                  )}
                </div>

                {/* Footer Join discussion action */}
                <div className="mt-3.5 pt-3 sm:mt-5 sm:pt-4 border-t border-border/40 flex justify-end">
                  <Link
                    href={isDebate ? `/debates/${room.slug}` : `/discussions/${room.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary group-hover:text-primary/80 transition-colors"
                  >
                    <span>{isDebate ? "Enter Debate" : "Join Discussion"}</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </article>
            );
          })}

          {/* Load More Button pagination */}
          {hasNextPage && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-bold text-foreground hover:bg-accent/40 shadow-sm transition-all cursor-pointer hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading more discussions...</span>
                  </>
                ) : (
                  <span>Load More Discussions</span>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
