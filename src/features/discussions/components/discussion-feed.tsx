"use client";

import Link from "next/link";
import { useState } from "react";
import { useTopics, useInfiniteDiscussions } from "@/features/discussions/hooks/use-discussions";
import { MessageSquare, Calendar, SlidersHorizontal, Plus, Loader2, Sparkles, ArrowRight, AlertCircle } from "lucide-react";

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
            Join structured, open conversations under standard topics. Participate with evidence.
          </p>
        </div>
        <Link
          href="/discussions/create"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span>New Discussion</span>
        </Link>
      </div>

      {/* Topic Filter Pills */}
      <div className="space-y-3">
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
          <div className="flex flex-wrap gap-2 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-8 w-20 rounded-full bg-muted/30 border border-border/50" />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedTopicId(undefined)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium border transition-all cursor-pointer ${
                selectedTopicId === undefined
                  ? "bg-primary border-primary text-primary-foreground shadow-sm"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
              }`}
            >
              All Topics
            </button>
            {topics?.map((topic) => {
              const isSelected = selectedTopicId === topic.id;
              return (
                <button
                  key={topic.id}
                  onClick={() => setSelectedTopicId(topic.id)}
                  className={`rounded-full px-4 py-1.5 text-xs font-medium border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground shadow-sm"
                      : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                  }`}
                >
                  {topic.name}
                </button>
              );
            })}
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
        <div className="space-y-4">
          {discussions.map(({ room, topic, discussion }) => {
            // Summary display with fallback to opening statement preview
            const hasSummary = !!discussion?.summary;
            const previewText = hasSummary
              ? discussion.summary
              : discussion?.openingStatement
              ? discussion.openingStatement.length > 180
                ? `${discussion.openingStatement.slice(0, 180)}...`
                : discussion.openingStatement
              : "";

            return (
              <article
                key={room.id}
                className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card/45 p-6 backdrop-blur-sm shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-border"
              >
                <div className="space-y-3">
                  {/* Topic and date tags */}
                  <div className="flex flex-wrap items-center gap-2">
                    {topic && (
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                        {topic.name}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{new Date(room.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                      })}</span>
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                    <Link href={`/discussions/${room.slug}`} className="outline-none focus:underline">
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
                  <div className={`p-3.5 rounded-xl text-sm leading-relaxed border ${
                    hasSummary 
                      ? "bg-primary/[0.02] border-primary/10 text-foreground/90 font-medium italic quotes" 
                      : "bg-muted/15 border-border/50 text-muted-foreground"
                  }`}>
                    {hasSummary && (
                      <span className="text-[11px] not-italic uppercase tracking-wide font-bold block text-primary/75 mb-1">
                        Summary
                      </span>
                    )}
                    <p>{previewText}</p>
                  </div>
                </div>

                {/* Footer Join discussion action */}
                <div className="mt-5 pt-4 border-t border-border/40 flex justify-end">
                  <Link
                    href={`/discussions/${room.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary group-hover:text-primary/80 transition-colors"
                  >
                    <span>Join Discussion</span>
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
