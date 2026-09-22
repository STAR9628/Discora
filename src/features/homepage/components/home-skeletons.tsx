"use client";

import { User } from "lucide-react";

/**
 * LoadingCard matches the geometry of cards in LoggedInHomepage (p-4, rounded-xl).
 */
function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
      <div className="h-4 w-3/4 rounded bg-muted/60" />
      <div className="h-3 w-1/2 rounded bg-muted/40" />
      <div className="h-3 w-2/3 rounded bg-muted/30" />
    </div>
  );
}

/**
 * Authenticated Home Skeleton (State B / State D).
 *
 * Visually mirrors LoggedInHomepage layout and proportions:
 * WelcomeBar (p-6, avatar + title + subtitle) + QuickActions (4-column grid, h-[46px])
 * + Tab bar (My Deliberations / Public Commons) + Deliberations section cards.
 * Prevents layout shift when authenticated data resolves.
 */
export function LoggedInHomepageSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-5xl space-y-8 py-8 pb-16 animate-pulse"
      aria-busy="true"
      aria-label="Loading your deliberations"
    >
      {/* WelcomeBar skeleton */}
      <div className="rounded-xl border border-border bg-gradient-to-r from-card/60 to-card/30 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-5 w-5 sm:h-6 sm:w-6 opacity-40" />
          </div>
          <div className="min-w-0 space-y-1.5">
            <div className="h-5 w-52 rounded bg-muted/60" />
            <div className="h-4 w-80 max-w-full rounded bg-muted/40" />
          </div>
        </div>
      </div>

      {/* QuickActions skeleton (4 cards matching QuickActions layout) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex h-[46px] items-center gap-2 rounded-xl border border-border bg-card/40 px-4 py-3"
          >
            <div className="h-4 w-4 shrink-0 rounded bg-primary/20" />
            <div className="h-3.5 w-24 rounded bg-muted/50" />
          </div>
        ))}
      </div>

      {/* Tab bar skeleton (My Deliberations / Public Commons) */}
      <div className="flex items-center gap-2 border-b border-border/60">
        <div className="px-4 py-2 border-b-2 border-primary">
          <div className="h-4 w-28 rounded bg-primary/30" />
        </div>
        <div className="px-4 py-2">
          <div className="h-4 w-24 rounded bg-muted/30" />
        </div>
      </div>

      {/* Deliberations section 1 skeleton */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-primary/20" />
          <div className="h-5 w-36 rounded bg-muted/60" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>

      {/* Deliberations section 2 skeleton */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded bg-primary/20" />
          <div className="h-5 w-44 rounded bg-muted/60" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}

/**
 * Neutral Auth Resolution Skeleton (State C).
 *
 * Rendered when auth session is genuinely unresolved and no auth session cookie
 * is detected. Provides stable layout without falsely presenting guest marketing,
 * guest CTA buttons, or guest onboarding steps.
 */
export function NeutralAuthResolutionSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-5xl space-y-8 py-8 pb-16 animate-pulse"
      aria-busy="true"
      aria-label="Loading Discora"
    >
      {/* Calm neutral banner placeholder */}
      <div className="rounded-xl border border-border bg-card/30 p-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-full bg-muted/40" />
          <div className="min-w-0 space-y-1.5">
            <div className="h-5 w-44 rounded bg-muted/60" />
            <div className="h-4 w-72 max-w-full rounded bg-muted/30" />
          </div>
        </div>
      </div>

      {/* Action pills placeholder */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[46px] rounded-xl border border-border bg-card/30 px-4 py-3"
          />
        ))}
      </div>

      {/* Content section placeholder */}
      <div className="space-y-4">
        <div className="h-5 w-40 rounded bg-muted/50" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}

/**
 * Structural preview of the guest Home experience.
 * Used if needed for cold-loading the guest page.
 */
export function GuestHomepageSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-5xl space-y-12 py-8 pb-16 animate-pulse"
      aria-busy="true"
      aria-label="Loading homepage"
    >
      {/* Hero: pill + h1 + two paragraphs + 4 CTA buttons */}
      <div className="space-y-8 text-center">
        <div className="space-y-4">
          <div className="inline-block">
            <div className="h-[26px] w-[340px] sm:w-[460px] max-w-full mx-auto rounded-full bg-primary/10 border border-primary/20" />
          </div>
          <div className="h-9 sm:h-10 w-full max-w-lg mx-auto rounded-xl bg-card/60" />
          <div className="space-y-2 max-w-2xl mx-auto">
            <div className="h-4 w-full rounded-lg bg-card/40" />
            <div className="h-4 w-5/6 mx-auto rounded-lg bg-card/40" />
          </div>
          <div className="space-y-2 max-w-2xl mx-auto pt-1">
            <div className="h-3.5 w-full rounded bg-card/30" />
            <div className="h-3.5 w-4/5 mx-auto rounded bg-card/30" />
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <div className="h-10 w-44 rounded-xl bg-card/50" />
          <div className="h-10 w-36 rounded-xl bg-card/50" />
          <div className="h-10 w-24 rounded-xl bg-card/50" />
          <div className="h-10 w-24 rounded-xl bg-card/50" />
        </div>
      </div>

      {/* HowItWorks: responsive header row + 4 step cards (p-4, icon + lines) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1 text-center sm:text-left">
            <div className="h-6 w-40 mx-auto sm:mx-0 rounded-lg bg-card/60" />
            <div className="h-3 w-72 max-w-full mx-auto sm:mx-0 rounded bg-card/30" />
          </div>
          <div className="h-8 w-44 mx-auto sm:mx-0 rounded-xl bg-card/40" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-border/70 bg-card/30 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="h-8 w-8 rounded-lg bg-muted/50" />
                <div className="h-3 w-12 rounded bg-muted/40" />
              </div>
              <div className="space-y-1.5">
                <div className="h-4 w-1/2 rounded bg-muted/60" />
                <div className="h-3 w-3/4 rounded bg-muted/40" />
                <div className="h-3 w-full rounded bg-muted/30" />
                <div className="h-3 w-5/6 rounded bg-muted/30" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ActiveDiscussions: header + 3 discussion cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-44 rounded-lg bg-card/60" />
          <div className="h-4 w-16 rounded bg-card/40" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card/40 p-5 space-y-3">
              <div className="h-4 w-3/4 rounded bg-muted/60" />
              <div className="h-3 w-1/3 rounded bg-muted/40" />
              <div className="h-4 w-full rounded bg-muted/30" />
              <div className="h-4 w-2/3 rounded bg-muted/30" />
            </div>
          ))}
        </div>
      </div>

      {/* ActiveDebates: header + 3 debate cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 w-40 rounded-lg bg-card/60" />
          <div className="h-4 w-16 rounded bg-card/40" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card/40 p-5 space-y-3">
              <div className="h-4 w-3/4 rounded bg-muted/60" />
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-muted/50" />
                  <div className="h-3 w-2/3 rounded bg-muted/40" />
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-muted/50" />
                  <div className="h-3 w-1/2 rounded bg-muted/40" />
                </div>
              </div>
              <div className="h-3 w-1/2 rounded bg-muted/30" />
            </div>
          ))}
        </div>
      </div>

      {/* InquirySpotlight: header + 3 cards */}
      <div className="space-y-4">
        <div className="space-y-1">
          <div className="h-6 w-40 rounded-lg bg-card/60" />
          <div className="h-3.5 w-64 rounded bg-card/30" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card/40 p-5 space-y-3">
              <div className="h-4 w-20 rounded-full bg-muted/50" />
              <div className="h-3 w-full rounded bg-muted/40" />
              <div className="h-4 w-5/6 rounded bg-muted/30" />
            </div>
          ))}
        </div>
      </div>

      {/* UnderstandingMetrics: header + 4 metrics */}
      <div className="space-y-4">
        <div className="space-y-1">
          <div className="h-6 w-36 rounded-lg bg-card/60" />
          <div className="h-3.5 w-72 rounded bg-card/30" />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card/40 p-5 space-y-2">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="h-7 w-12 rounded bg-muted/60" />
                  <div className="h-3 w-20 rounded bg-muted/40" />
                </div>
                <div className="h-8 w-8 rounded-lg bg-muted/40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
