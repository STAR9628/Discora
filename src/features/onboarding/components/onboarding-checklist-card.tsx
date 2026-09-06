"use client";

import Link from "next/link";
import {
  Compass,
  CheckCircle2,
  Circle,
  Sparkles,
  GitBranch,
  MessageSquare,
  X,
  ArrowRight,
} from "lucide-react";
import { useOnboarding } from "../hooks/use-onboarding";

export function OnboardingChecklistCard() {
  const {
    dismissedGuides,
    hasInteractedSandbox,
    selectedTopics,
    dismissGuide,
    openDeck,
  } = useOnboarding();

  const isDismissed = !!dismissedGuides["homepage_checklist"];
  if (isDismissed) return null;

  const hasSelectedTopics = selectedTopics.length > 0;

  return (
    <section
      data-testid="onboarding-checklist-card"
      className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card/50 to-card/30 p-5 sm:p-6 backdrop-blur-sm space-y-4 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Compass className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Welcome to Discora — Your Getting Started Guide
            </h2>
            <p className="text-xs text-muted-foreground">
              A quick roadmap to help you explore, reason, and contribute effectively.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => dismissGuide("homepage_checklist")}
          className="text-muted-foreground hover:text-foreground rounded p-1 transition-colors cursor-pointer"
          aria-label="Dismiss getting started checklist"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 4 Action Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* Step 1: The Model */}
        <button
          type="button"
          onClick={() => openDeck("model")}
          className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-3 text-left transition-all hover:bg-card/80 hover:border-border cursor-pointer group"
        >
          <div className="mt-0.5 text-primary">
            <GitBranch className="h-4 w-4" />
          </div>
          <div className="space-y-0.5 text-xs">
            <span className="font-bold block text-foreground group-hover:text-primary transition-colors">
              1. Learn the Epistemic Model
            </span>
            <span className="text-[11px] text-muted-foreground">
              See how Questions, Claims, Evidence, and Inquiries connect.
            </span>
          </div>
        </button>

        {/* Step 2: Try Sandbox */}
        <button
          type="button"
          onClick={() => openDeck("sandbox")}
          className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-3 text-left transition-all hover:bg-card/80 hover:border-border cursor-pointer group"
        >
          <div className="mt-0.5">
            {hasInteractedSandbox ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <Sparkles className="h-4 w-4 text-amber-400" />
            )}
          </div>
          <div className="space-y-0.5 text-xs">
            <span className="font-bold block text-foreground group-hover:text-primary transition-colors">
              2. Try &ldquo;What Moves the Needle?&rdquo;
            </span>
            <span className="text-[11px] text-muted-foreground">
              Interactive 15-second simulation showing how evidence updates claim support.
            </span>
          </div>
        </button>

        {/* Step 3: Select Topics */}
        <button
          type="button"
          onClick={() => openDeck("interests")}
          className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-3 text-left transition-all hover:bg-card/80 hover:border-border cursor-pointer group"
        >
          <div className="mt-0.5">
            {hasSelectedTopics ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="space-y-0.5 text-xs">
            <span className="font-bold block text-foreground group-hover:text-primary transition-colors">
              3. Select Exploration Topics
            </span>
            <span className="text-[11px] text-muted-foreground">
              Personalize where you explore (AI, Science, Philosophy, Governance).
            </span>
          </div>
        </button>

        {/* Step 4: Explore Rooms */}
        <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-3 text-left">
          <div className="mt-0.5 text-primary">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div className="space-y-1 text-xs">
            <span className="font-bold block text-foreground">
              4. Explore Real Discourse
            </span>
            <div className="flex items-center gap-2 pt-0.5">
              <Link
                href="/discussions"
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                Discussions
              </Link>
              <span className="text-muted-foreground/40">•</span>
              <Link
                href="/debates"
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                Debates
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Write-First Contribution Encouragement */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/40 text-xs">
        <p className="text-muted-foreground text-[11px]">
          <strong>Write-First Principle:</strong> When you contribute, draft your thoughts naturally.
          Discora helps you extract discrete claims and link evidence when ready.
        </p>

        <button
          type="button"
          onClick={() => openDeck("model")}
          className="inline-flex items-center gap-1 font-bold text-primary hover:underline cursor-pointer"
        >
          <span>Open Discovery Deck</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </section>
  );
}
