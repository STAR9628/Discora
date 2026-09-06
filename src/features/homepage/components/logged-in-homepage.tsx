"use client";

import Link from "next/link";
import {
  HelpCircle,
  MessageSquare,
  Swords,
  FileText,
  TrendingUp,
  AlertTriangle,
  User,
  Hash,
  ArrowRight,
  Plus,
  Search,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useCurrentProfile } from "@/features/profiles/hooks/use-profile";
import {
  useMyOpenInquiries,
  useInquiriesOnMyClaims,
  useNewEvidenceOnVotedClaims,
  useMyInquiryResponses,
  useMyDebatesAttention,
  useMyTopicEvidence,
  useMyUnderstandingEvolved,
  useRecentDiscussions,
  useRecentDebates,
  useOnboardingStatus,
} from "../hooks/use-homepage";
import type { InquiriesOnMyClaim, NewEvidenceOnVotedClaim } from "../services/homepage-personal-service";
import type { DiscussionFeedItem } from "@/features/discussions/services/discussion-service";
import type { DebateFeedItem } from "@/features/debates/services/debate-service";
import type { UnderstandingEvolved } from "../services/homepage-personal-service";
import { OnboardingChecklistCard } from "@/features/onboarding";
import { RecentlySavedSection } from "./recently-saved-section";
import { RecentlyEngagedSection } from "./recently-engaged-section";

function SectionHeader({
  title,
  icon: Icon,
}: {
  title: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary" />
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-5 animate-pulse space-y-3">
      <div className="h-4 w-3/4 rounded bg-muted" />
      <div className="h-3 w-1/2 rounded bg-muted" />
      <div className="h-3 w-2/3 rounded bg-muted" />
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive flex items-center gap-2">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function WelcomeBar() {
  const { status } = useAuth();
  const { data: profile } = useCurrentProfile();
  const displayName = profile?.displayName || profile?.username || "there";

  if (status !== "authenticated") return null;

  return (
    <div className="rounded-xl border border-border bg-gradient-to-r from-card/60 to-card/30 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <User className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Welcome back, {displayName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Explore discussions, join debates, and build understanding.
          </p>
        </div>
      </div>
    </div>
  );
}

const QUICK_ACTIONS = [
  { label: "Start Discussion", icon: Plus, href: "/discussions/create" },
  { label: "Start Debate", icon: Swords, href: "/debates/create" },
  { label: "Browse Discussions", icon: MessageSquare, href: "/discussions" },
  { label: "Browse Debates", icon: Search, href: "/debates" },
] as const;

function QuickActions() {
  return (
    <section>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center gap-2 rounded-xl border border-border bg-card/40 px-4 py-3 text-sm font-medium text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30 hover:bg-card/60"
            >
              <Icon className="h-4 w-4 text-primary" />
              {action.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function DiscussionCard({ item }: { item: DiscussionFeedItem }) {
  const preview = item.discussion?.openingStatement
    ? item.discussion.openingStatement.length > 120
      ? item.discussion.openingStatement.slice(0, 120) + "…"
      : item.discussion.openingStatement
    : item.room.description?.slice(0, 120);

  return (
    <Link
      href={`/discussions/${item.room.slug}`}
      className="group flex flex-col rounded-xl border border-border bg-card/40 p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-border/80"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
          {item.room.title}
        </h3>
        <span className="shrink-0 text-xs text-muted-foreground">
          {timeAgo(item.room.createdAt)}
        </span>
      </div>
      {item.topic && (
        <div className="mt-1.5 flex items-center gap-1">
          <span className="inline-flex items-center gap-1 rounded-md bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary">
            <Hash className="h-3 w-3" />
            {item.topic.name}
          </span>
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

function DebateCard({ item }: { item: DebateFeedItem }) {
  return (
    <Link
      href={`/debates/${item.room.slug}`}
      className="group flex flex-col rounded-xl border border-border bg-card/40 p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-border/80"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
          {item.room.title}
        </h3>
        <span className="shrink-0 text-xs text-muted-foreground">
          {timeAgo(item.room.createdAt)}
        </span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
          <span className="text-xs font-medium text-emerald-400">
            {item.debate.propositionTitle}
          </span>
        </div>
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-2.5">
          <span className="text-xs font-medium text-rose-400">
            {item.debate.oppositionTitle}
          </span>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        <span>{item.debate.totalParticipants} participant{item.debate.totalParticipants !== 1 ? "s" : ""}</span>
        <span>{item.debate.totalClaims} claim{item.debate.totalClaims !== 1 ? "s" : ""}</span>
      </div>
    </Link>
  );
}

function RecentDiscussions() {
  const { data: items, isLoading, error } = useRecentDiscussions(5);
  const discussions = (items ?? []).filter(
    (item) => item.room.roomType === "discussion"
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionHeader title="Recent Discussions" icon={MessageSquare} />
        <Link
          href="/discussions"
          className="text-xs font-medium text-primary hover:underline"
        >
          View all
        </Link>
      </div>
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <LoadingCard />
          <LoadingCard />
        </div>
      ) : error ? (
        <ErrorMessage message="Could not load discussions." />
      ) : discussions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/20 p-8 text-center text-sm text-muted-foreground">
          No discussions yet.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {discussions.map((item) => (
            <DiscussionCard key={item.room.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

function RecentDebates() {
  const { data: page, isLoading, error } = useRecentDebates(5);
  const debates = page?.items.slice(0, 5) ?? [];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <SectionHeader title="Recent Debates" icon={Swords} />
        <Link
          href="/debates"
          className="text-xs font-medium text-primary hover:underline"
        >
          View all
        </Link>
      </div>
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <LoadingCard />
          <LoadingCard />
        </div>
      ) : error ? (
        <ErrorMessage message="Could not load debates." />
      ) : debates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/20 p-8 text-center text-sm text-muted-foreground">
          No debates yet.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {debates.map((item) => (
            <DebateCard key={item.room.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

function FirstUserBanner() {
  return <OnboardingChecklistCard />;
}

function MyOpenInquiries() {
  const { data, isLoading, error } = useMyOpenInquiries();
  const inquiries = data ?? [];

  if (!isLoading && !error && inquiries.length === 0) return null;

  return (
    <section className="space-y-3">
      <SectionHeader title="My Open Inquiries" icon={HelpCircle} />
      {isLoading ? (
        <div className="space-y-3">
          <LoadingCard />
          <LoadingCard />
        </div>
      ) : error ? (
        <ErrorMessage message="Could not load your inquiries." />
      ) : (
        <div className="space-y-3">
          {inquiries.map((inquiry) => (
            <Link
              key={inquiry.id}
              href={`/inquiries/${inquiry.id}`}
              className="group flex flex-col gap-1 rounded-xl border border-border bg-card/40 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-border/80"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium uppercase tracking-wider text-primary/80">
                  {inquiry.inquiryType.replace("_", " ")}
                </span>
                <span aria-hidden="true">·</span>
                <span>{inquiry.roomTitle}</span>
              </div>
              <p className="text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2">
                {inquiry.content}
              </p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                  {inquiry.responseCount} response
                  {inquiry.responseCount !== 1 ? "s" : ""}
                </span>
                <span className="capitalize">{inquiry.status}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function InquiriesOnMyClaims() {
  const { data, isLoading, error } = useInquiriesOnMyClaims();
  const inquiries = data ?? [];

  if (!isLoading && !error && inquiries.length === 0) return null;

  return (
    <section className="space-y-3">
      <SectionHeader title="Inquiries on Your Claims" icon={HelpCircle} />
      {isLoading ? (
        <div className="space-y-3">
          <LoadingCard />
          <LoadingCard />
        </div>
      ) : error ? (
        <ErrorMessage message="Could not load inquiries on your claims." />
      ) : (
        <div className="space-y-3">
          {inquiries.map((inquiry: InquiriesOnMyClaim) => (
            <Link
              key={inquiry.id}
              href={`/inquiries/${inquiry.id}`}
              className="group flex flex-col gap-2 rounded-xl border border-amber-500/30 bg-amber-950/10 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-amber-500/60"
            >
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="font-semibold uppercase tracking-wider text-amber-400">
                    Structured Challenge
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="capitalize text-muted-foreground">{inquiry.inquiryType.replace("_", " ")}</span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate max-w-[160px] sm:max-w-[240px]">{inquiry.roomTitle}</span>
                </div>
                <span className="shrink-0 text-xs font-medium text-amber-400/90 group-hover:text-amber-300 transition-colors flex items-center gap-1">
                  Review Inquiry
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>

              <div>
                <p className="text-sm font-medium text-foreground group-hover:text-amber-300 transition-colors line-clamp-2">
                  &ldquo;{inquiry.content}&rdquo;
                </p>
              </div>

              <div className="rounded-lg bg-card/60 border border-border/50 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground/80">On your claim: </span>
                <span className="line-clamp-1 italic text-foreground/70">&ldquo;{inquiry.targetClaimContent}&rdquo;</span>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
                <div className="flex items-center gap-1.5">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span>Raised by {inquiry.inquiryUsername}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span>
                    {inquiry.responseCount} response{inquiry.responseCount !== 1 ? "s" : ""}
                  </span>
                  <span className="capitalize">{inquiry.status}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}


function getEvidenceSignalInfo(
  userVote: "agree" | "disagree",
  direction: "support" | "contradict" | "context"
) {
  if (direction === "context") {
    return {
      badgeLabel: "Context",
      headline: "New context added to a claim you evaluated",
      badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      cardBorder: "border-blue-500/30 bg-blue-950/10 hover:border-blue-500/60",
      accentText: "text-blue-400/90 group-hover:text-blue-300",
    };
  }
  if (userVote === "agree") {
    if (direction === "contradict") {
      return {
        badgeLabel: "Counter-Evidence",
        headline: "Counter-evidence added to a claim you supported",
        badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        cardBorder: "border-rose-500/30 bg-rose-950/10 hover:border-rose-500/60",
        accentText: "text-rose-400/90 group-hover:text-rose-300",
      };
    } else {
      return {
        badgeLabel: "Supporting Evidence",
        headline: "Supporting evidence added to a claim you supported",
        badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        cardBorder: "border-emerald-500/30 bg-emerald-950/10 hover:border-emerald-500/60",
        accentText: "text-emerald-400/90 group-hover:text-emerald-300",
      };
    }
  } else {
    // userVote === "disagree"
    if (direction === "support") {
      return {
        badgeLabel: "Supporting Evidence",
        headline: "Supporting evidence added to a claim you contested",
        badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        cardBorder: "border-amber-500/30 bg-amber-950/10 hover:border-amber-500/60",
        accentText: "text-amber-400/90 group-hover:text-amber-300",
      };
    } else {
      return {
        badgeLabel: "Counter-Evidence",
        headline: "Counter-evidence added to a claim you contested",
        badgeClass: "bg-teal-500/10 text-teal-400 border-teal-500/20",
        cardBorder: "border-teal-500/30 bg-teal-950/10 hover:border-teal-500/60",
        accentText: "text-teal-400/90 group-hover:text-teal-300",
      };
    }
  }
}

function NewEvidenceOnVotedClaims() {
  const { data, isLoading, error } = useNewEvidenceOnVotedClaims();
  const items = data ?? [];

  if (!isLoading && !error && items.length === 0) return null;

  return (
    <section className="space-y-3">
      <SectionHeader title="New Evidence on Claims You Evaluated" icon={FileText} />
      {isLoading ? (
        <div className="space-y-3">
          <LoadingCard />
          <LoadingCard />
        </div>
      ) : error ? (
        <ErrorMessage message="Could not load new evidence on evaluated claims." />
      ) : (
        <div className="space-y-3">
          {items.map((item: NewEvidenceOnVotedClaim) => {
            const signal = getEvidenceSignalInfo(item.userVote, item.direction);
            const destinationUrl = item.roomType === "debate"
              ? `/debates/${item.roomSlug}/evidence?highlight=${item.evidenceId}#ev-${item.evidenceId}`
              : `/discussions/${item.roomSlug}/evidence?highlight=${item.evidenceId}#ev-${item.evidenceId}`;

            return (
              <Link
                key={item.evidenceId}
                href={destinationUrl}
                className={`group flex flex-col gap-2.5 rounded-xl border p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${signal.cardBorder}`}
              >
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${signal.badgeClass}`}>
                      {signal.badgeLabel}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="truncate max-w-[160px] sm:max-w-[260px] font-medium text-foreground/80">
                      {item.roomTitle}
                    </span>
                  </div>
                  <span className={`shrink-0 text-xs font-medium transition-colors flex items-center gap-1 ${signal.accentText}`}>
                    Inspect Evidence
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>

                <div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {signal.headline}
                  </p>
                  <p className="mt-1 text-xs text-foreground/85 leading-relaxed line-clamp-2 italic">
                    &ldquo;{item.evidenceContent}&rdquo;
                  </p>
                  {item.sourceTitle && (
                    <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="truncate max-w-[320px] sm:max-w-[480px]">
                        Source: {item.sourceTitle}
                      </span>
                    </div>
                  )}
                </div>

                <div className="rounded-lg bg-card/60 border border-border/50 px-3 py-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground/80">
                    On claim you {item.userVote === "agree" ? "supported" : "contested"}:{" "}
                  </span>
                  <span className="line-clamp-1 italic text-foreground/70">
                    &ldquo;{item.claimContent}&rdquo;
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span>Added by {item.authorUsername}</span>
                  </div>
                  <span>{timeAgo(item.evidenceCreatedAt)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function MyInquiryResponses() {
  const { data, isLoading, error } = useMyInquiryResponses();
  const responses = data ?? [];

  if (!isLoading && !error && responses.length === 0) return null;

  return (
    <section className="space-y-3">
      <SectionHeader title="Responses to My Inquiries" icon={MessageSquare} />
      {isLoading ? (
        <div className="space-y-3">
          <LoadingCard />
          <LoadingCard />
        </div>
      ) : error ? (
        <ErrorMessage message="Could not load responses." />
      ) : (
        <div className="space-y-3">
          {responses.map((r) => (
            <Link
              key={r.inquiryId}
              href={`/inquiries/${r.inquiryId}`}
              className="group flex flex-col gap-1 rounded-xl border border-border bg-card/40 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-border/80"
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium uppercase tracking-wider text-primary/80">
                  {r.inquiryType.replace("_", " ")}
                </span>
                <span aria-hidden="true">·</span>
                <span>{r.roomTitle}</span>
              </div>
              <p className="text-sm text-foreground line-clamp-1">
                {r.inquiryContent}
              </p>
              {r.latestResponseContent && (
                <div className="mt-1 rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground italic">
                  &ldquo;{r.latestResponseContent.slice(0, 120)}
                  {r.latestResponseContent.length > 120 ? "…" : ""}&rdquo;
                  {r.latestResponseUsername && (
                    <span className="not-italic font-medium">
                      {" "}— {r.latestResponseUsername}
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                  {r.responseCount} response
                  {r.responseCount !== 1 ? "s" : ""}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function DebatesNeedingAttention() {
  const { data, isLoading, error } = useMyDebatesAttention();
  const debates = data ?? [];

  if (!isLoading && !error && debates.length === 0) return null;

  return (
    <section className="space-y-3">
      <SectionHeader title="Debates Needing Attention" icon={Swords} />
      {isLoading ? (
        <div className="space-y-3">
          <LoadingCard />
          <LoadingCard />
        </div>
      ) : error ? (
        <ErrorMessage message="Could not load debate updates." />
      ) : (
        <div className="space-y-3">
          {debates.map((d) => (
            <Link
              key={d.roomId}
              href={`/debates/${d.slug}`}
              className="group flex flex-col gap-1 rounded-xl border border-border bg-card/40 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-border/80"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                <span>{d.title}</span>
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  {d.propositionTitle}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-rose-500" />
                  {d.oppositionTitle}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                <span>
                  Your claims: {d.myClaimCount}
                </span>
                <span>
                  Opposing claims: {d.opposingClaimCount}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function NewEvidenceTopics() {
  const { data, isLoading, error } = useMyTopicEvidence(7);
  const topics = data ?? [];

  if (!isLoading && !error && topics.length === 0) return null;

  return (
    <section className="space-y-3">
      <SectionHeader title="New Evidence on My Topics" icon={FileText} />
      {isLoading ? (
        <div className="space-y-3">
          <LoadingCard />
          <LoadingCard />
        </div>
      ) : error ? (
        <ErrorMessage message="Could not load new evidence." />
      ) : (
        <div className="space-y-3">
          {topics.map((t) => (
            <div
              key={t.topicId}
              className="rounded-xl border border-border bg-card/40 p-4"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Hash className="h-3.5 w-3.5 text-primary" />
                {t.topicName}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t.evidenceCount} new piece{t.evidenceCount !== 1 ? "s" : ""} of evidence
              </p>
              {t.rooms.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {t.rooms.map((room) => (
                    <Link
                      key={room.roomId}
                      href={`/discussions/${room.roomSlug}`}
                      className="inline-flex items-center gap-1 rounded-md bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      {room.roomTitle}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function getConsensusInsight(item: UnderstandingEvolved): string {
  if (item.consensusRatio === null) return "No consensus data yet";
  if (item.consensusRatio >= 60) {
    return item.myVote === "agree"
      ? `Current consensus aligns with your position (${item.consensusRatio}% agree)`
      : `Current consensus challenges your position (${item.consensusRatio}% agree)`;
  }
  if (item.consensusRatio <= 40) {
    return item.myVote === "agree"
      ? `Current consensus challenges your position (${item.consensusRatio}% agree)`
      : `Current consensus aligns with your position (${item.consensusRatio}% agree)`;
  }
  return `Discussion remains divided (${item.consensusRatio}% agree)`;
}

function getConsensusBadge(item: UnderstandingEvolved): {
  label: string;
  className: string;
} | null {
  if (item.consensusRatio === null) return null;
  if (item.consensusRatio >= 60) {
    return item.myVote === "agree"
      ? { label: "Aligns with your vote", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" }
      : { label: "Challenges your vote", className: "bg-rose-500/10 text-rose-400 border-rose-500/20" };
  }
  if (item.consensusRatio <= 40) {
    return item.myVote === "agree"
      ? { label: "Challenges your vote", className: "bg-rose-500/10 text-rose-400 border-rose-500/20" }
      : { label: "Aligns with your vote", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
  }
  return { label: "Divided", className: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
}

type GroupedUnderstanding = {
  roomId: string;
  roomTitle: string;
  roomSlug: string;
  claimCount: number;
  significantClaim: UnderstandingEvolved;
};

function groupUnderstandingEvolved(
  items: UnderstandingEvolved[]
): GroupedUnderstanding[] {
  const groups = new Map<string, UnderstandingEvolved[]>();

  for (const item of items) {
    const existing = groups.get(item.roomId);
    if (existing) {
      existing.push(item);
    } else {
      groups.set(item.roomId, [item]);
    }
  }

  const result: GroupedUnderstanding[] = [];

  for (const [roomId, claims] of groups) {
    const sorted = [...claims].sort((a, b) => {
      const aRatio = a.consensusRatio ?? 50;
      const bRatio = b.consensusRatio ?? 50;
      return Math.abs(bRatio - 50) - Math.abs(aRatio - 50);
    });

    result.push({
      roomId,
      roomTitle: sorted[0].roomTitle,
      roomSlug: sorted[0].roomSlug,
      claimCount: claims.length,
      significantClaim: sorted[0],
    });
  }

  result.sort((a, b) => {
    const aRatio = a.significantClaim.consensusRatio ?? 50;
    const bRatio = b.significantClaim.consensusRatio ?? 50;
    return Math.abs(bRatio - 50) - Math.abs(aRatio - 50);
  });

  return result.slice(0, 5);
}

function UnderstandingEvolved() {
  const { data, isLoading, error } = useMyUnderstandingEvolved();
  const items = data ?? [];
  const grouped = groupUnderstandingEvolved(items);

  if (!isLoading && !error && grouped.length === 0) return null;

  return (
    <section className="space-y-3">
      <SectionHeader title="My Understanding Evolved" icon={TrendingUp} />
      {isLoading ? (
        <div className="space-y-3">
          <LoadingCard />
          <LoadingCard />
        </div>
      ) : error ? (
        <ErrorMessage message="Could not load understanding updates." />
      ) : (
        <div className="space-y-3">
          {grouped.map((group) => {
            const item = group.significantClaim;
            const insight = getConsensusInsight(item);
            const badge = getConsensusBadge(item);
            return (
              <Link
                key={group.roomId}
                href={`/discussions/${group.roomSlug}`}
                className="group flex flex-col gap-1 rounded-xl border border-border bg-card/40 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-border/80"
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground/80">
                    {group.roomTitle}
                  </span>
                  {badge && (
                    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${badge.className}`}>
                      {badge.label}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                  {item.claimContent}
                </p>
                <p className="text-xs text-muted-foreground italic">
                  {insight}
                </p>
                {item.latestEvidence && (
                  <div className="mt-1 rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground italic">
                    &ldquo;{item.latestEvidence.slice(0, 100)}
                    {item.latestEvidence.length > 100 ? "…" : ""}&rdquo;
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function PersonalizedUpdates() {
  const inquiriesOnClaims = useInquiriesOnMyClaims();
  const newEvidenceOnClaims = useNewEvidenceOnVotedClaims();
  const openInquiries = useMyOpenInquiries();
  const inquiryResponses = useMyInquiryResponses();
  const debatesAttention = useMyDebatesAttention();
  const topicEvidence = useMyTopicEvidence(7);
  const understandingEvolved = useMyUnderstandingEvolved();
  const { data: onboarding } = useOnboardingStatus();

  const hasActivity =
    (inquiriesOnClaims.data?.length ?? 0) > 0 ||
    (newEvidenceOnClaims.data?.length ?? 0) > 0 ||
    (openInquiries.data?.length ?? 0) > 0 ||
    (inquiryResponses.data?.length ?? 0) > 0 ||
    (debatesAttention.data?.length ?? 0) > 0 ||
    (topicEvidence.data?.length ?? 0) > 0 ||
    (understandingEvolved.data?.length ?? 0) > 0;

  const isLoading =
    inquiriesOnClaims.isLoading ||
    newEvidenceOnClaims.isLoading ||
    openInquiries.isLoading ||
    inquiryResponses.isLoading ||
    debatesAttention.isLoading ||
    topicEvidence.isLoading ||
    understandingEvolved.isLoading;

  if (isLoading) {
    return (
      <section className="space-y-4">
        <div className="border-b border-border pb-2">
          <h2 className="text-lg font-semibold text-foreground">
            Your Inquiries &amp; Understanding
          </h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <LoadingCard />
          <LoadingCard />
        </div>
      </section>
    );
  }

  if (!hasActivity) {
    if (onboarding?.isFirstTime) return null;

    return (
      <section className="space-y-3">
        <div className="rounded-xl border border-dashed border-border/80 bg-card/20 p-5 text-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">
                Your understanding trail
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Vote on a claim or open a structured inquiry across discussions to start tracking how consensus and evidence develop over time.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="border-b border-border pb-2 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
        <h2 className="text-lg font-semibold text-foreground">
          Your Inquiries &amp; Understanding
        </h2>
        <span className="text-xs text-muted-foreground">
          Active deliberations and inquiries you participate in
        </span>
      </div>
      <InquiriesOnMyClaims />
      <NewEvidenceOnVotedClaims />
      <MyInquiryResponses />
      <MyOpenInquiries />
      <UnderstandingEvolved />
      <DebatesNeedingAttention />
      <NewEvidenceTopics />
    </section>
  );
}

export function LoggedInHomepage() {
  return (
    <div className="mx-auto max-w-6xl space-y-8 py-8 pb-16">
      <WelcomeBar />
      <FirstUserBanner />
      <QuickActions />
      <RecentlySavedSection />
      <RecentlyEngagedSection />
      <PersonalizedUpdates />
      <RecentDiscussions />
      <RecentDebates />
    </div>
  );
}
