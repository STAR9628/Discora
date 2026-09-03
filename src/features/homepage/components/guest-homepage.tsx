"use client";

import Link from "next/link";
import {
  MessageSquare,
  Scale,
  Search,
  LogIn,
  HelpCircle,
  FileText,
  CheckCircle,
  AlertTriangle,
  Hash,
} from "lucide-react";
import {
  useHomepageMetrics,
  useFeaturedInquiries,
  useHomepageDiscussions,
  useHomepageDebates,
} from "../hooks/use-homepage";
import type { DiscussionFeedItem } from "@/features/discussions/services/discussion-service";
import type { DebateFeedItem } from "@/features/debates/services/debate-service";

const CTA_LINKS = [
  { label: "Browse Discussions", icon: MessageSquare, href: "/discussions" },
  { label: "Explore Debates", icon: Scale, href: "/debates" },
  { label: "Search", icon: Search, href: "/search" },
  { label: "Sign In", icon: LogIn, href: "/login" },
] as const;

function HeroSection() {
  return (
    <div className="space-y-8 text-center">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Structured Discussion &amp; Debate
        </h1>
        <p className="mx-auto max-w-2xl text-base text-muted-foreground">
          A platform for evidence-based dialogue. Explore discussions, follow
          debates, and build understanding — one claim at a time.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        {CTA_LINKS.map((cta) => {
          const Icon = cta.icon;
          return (
            <Link
              key={cta.href}
              href={cta.href}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Icon className="h-4 w-4" />
              {cta.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function DiscussionCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-5 animate-pulse space-y-3">
      <div className="h-5 w-3/4 rounded bg-muted" />
      <div className="h-3 w-1/3 rounded bg-muted" />
      <div className="h-4 w-full rounded bg-muted" />
      <div className="h-4 w-2/3 rounded bg-muted" />
    </div>
  );
}

function DiscussionCard({
  item,
}: {
  item: DiscussionFeedItem;
}) {
  const preview = item.discussion?.openingStatement
    ? item.discussion.openingStatement.length > 100
      ? item.discussion.openingStatement.slice(0, 100) + "…"
      : item.discussion.openingStatement
    : item.room.description?.slice(0, 100);

  return (
    <Link
      href={`/discussions/${item.room.slug}`}
      className="group flex flex-col rounded-xl border border-border bg-card/40 p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-border/80"
    >
      <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
        {item.room.title}
      </h3>
      {item.topic && (
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <Hash className="h-3 w-3" />
          {item.topic.name}
        </div>
      )}
      {preview && (
        <p className="mt-2 text-xs text-muted-foreground/80 leading-relaxed line-clamp-2">
          {preview}
        </p>
      )}
    </Link>
  );
}

function ActiveDiscussions() {
  const { data: items, isLoading, error } = useHomepageDiscussions(10);
  const discussions = (items ?? [])
    .filter((item) => item.room.roomType === "discussion")
    .slice(0, 3);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Active Discussions
        </h2>
        <Link
          href="/discussions"
          className="text-xs font-medium text-primary hover:underline"
        >
          View all
        </Link>
      </div>
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DiscussionCardSkeleton />
          <DiscussionCardSkeleton />
          <DiscussionCardSkeleton />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Could not load discussions.
        </div>
      ) : discussions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/20 p-8 text-center text-sm text-muted-foreground">
          No discussions yet. Be the first to start one.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {discussions.map((item) => (
            <DiscussionCard key={item.room.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

function DebateCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-5 animate-pulse space-y-3">
      <div className="h-5 w-3/4 rounded bg-muted" />
      <div className="h-3 w-1/2 rounded bg-muted" />
      <div className="h-3 w-1/2 rounded bg-muted" />
      <div className="h-4 w-1/4 rounded bg-muted" />
    </div>
  );
}

function DebateCard({
  item,
}: {
  item: DebateFeedItem;
}) {
  return (
    <Link
      href={`/debates/${item.room.slug}`}
      className="group flex flex-col rounded-xl border border-border bg-card/40 p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-border/80"
    >
      <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
        {item.room.title}
      </h3>
      <div className="mt-2 space-y-1">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">
            {item.debate.propositionTitle}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="inline-block h-2 w-2 rounded-full bg-rose-500" />
          <span className="text-muted-foreground">
            {item.debate.oppositionTitle}
          </span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span>{item.debate.totalParticipants} participant{item.debate.totalParticipants !== 1 ? "s" : ""}</span>
        <span>{item.debate.totalClaims} claim{item.debate.totalClaims !== 1 ? "s" : ""}</span>
      </div>
    </Link>
  );
}

function ActiveDebates() {
  const { data: page, isLoading, error } = useHomepageDebates();
  const debates = page?.items.slice(0, 3) ?? [];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Active Debates
        </h2>
        <Link
          href="/debates"
          className="text-xs font-medium text-primary hover:underline"
        >
          View all
        </Link>
      </div>
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DebateCardSkeleton />
          <DebateCardSkeleton />
          <DebateCardSkeleton />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Could not load debates.
        </div>
      ) : debates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/20 p-8 text-center text-sm text-muted-foreground">
          No active debates right now.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {debates.map((item) => (
            <DebateCard key={item.room.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

function InquirySpotlight() {
  const { data: inquiries, isLoading, error } = useFeaturedInquiries(1);
  const inquiry = inquiries?.[0];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Inquiry Spotlight
        </h2>
      </div>
      {isLoading ? (
        <div className="rounded-xl border border-border bg-card/40 p-6 animate-pulse space-y-3">
          <div className="h-4 w-1/3 rounded bg-muted" />
          <div className="h-5 w-full rounded bg-muted" />
          <div className="h-4 w-2/3 rounded bg-muted" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Could not load spotlight.
        </div>
      ) : !inquiry ? (
        <div className="rounded-xl border border-dashed border-border bg-card/20 p-8 text-center text-sm text-muted-foreground">
          No open inquiries at the moment. Check back soon.
        </div>
      ) : (
        <Link
          href={`/discussions/${inquiry.roomSlug}`}
          className="group flex flex-col rounded-xl border border-border bg-gradient-to-br from-card/40 to-card/20 p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <HelpCircle className="h-3.5 w-3.5" />
            <span className="font-medium uppercase tracking-wider">
              {inquiry.inquiryType.replace("_", " ")}
            </span>
            <span aria-hidden="true">·</span>
            <span>{inquiry.roomTitle}</span>
          </div>
          <p className="mt-3 text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-relaxed">
            {inquiry.content}
          </p>
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              {inquiry.responseCount} response{inquiry.responseCount !== 1 ? "s" : ""}
            </span>
            <span className="capitalize">{inquiry.status}</span>
          </div>
        </Link>
      )}
    </section>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function UnderstandingMetrics() {
  const { data: metrics, isLoading, error } = useHomepageMetrics();

  const items = [
    {
      label: "Open Inquiries",
      value: metrics?.openInquiries ?? 0,
      icon: HelpCircle,
    },
    {
      label: "Claims with Evidence",
      value: metrics?.claimsWithEvidence ?? 0,
      icon: FileText,
    },
    {
      label: "Debates (Both Sides)",
      value: metrics?.debatesBothSides ?? 0,
      icon: Scale,
    },
    {
      label: "Satisfied Today",
      value: metrics?.satisfiedToday ?? 0,
      icon: CheckCircle,
    },
  ];

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">
        Understanding Metrics
      </h2>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-border bg-card/40 p-5 animate-pulse space-y-2"
            >
              <div className="h-7 w-12 rounded bg-muted" />
              <div className="h-3 w-20 rounded bg-muted" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Could not load metrics.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {items.map((item) => (
            <MetricCard
              key={item.label}
              label={item.label}
              value={item.value}
              icon={item.icon}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function GuestHomepage() {
  return (
    <div className="mx-auto max-w-5xl space-y-12 py-8 pb-16">
      <HeroSection />
      <ActiveDiscussions />
      <ActiveDebates />
      <InquirySpotlight />
      <UnderstandingMetrics />
    </div>
  );
}
