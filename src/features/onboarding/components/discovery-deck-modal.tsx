"use client";

import { useEffect, useRef } from "react";
import {
  X,
  Sparkles,
  HelpCircle,
  GitBranch,
  FileText,
  Search,
  Scale,
  Swords,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  Check,
  Compass,
} from "lucide-react";
import { useOnboarding } from "../hooks/use-onboarding";
import { EpistemicSandbox } from "./epistemic-sandbox";
import { ExplorationInterestSelector } from "./exploration-interest-selector";
import type { DiscoveryDeckTab } from "../types";

const TABS: { id: DiscoveryDeckTab; label: string; icon: typeof Sparkles }[] = [
  { id: "model", label: "1. The Model", icon: GitBranch },
  { id: "sandbox", label: "2. Try It", icon: Sparkles },
  { id: "modes", label: "3. Discussion vs Debate", icon: Scale },
  { id: "interests", label: "4. Exploration", icon: Compass },
];

export function DiscoveryDeckModal() {
  const {
    isDeckOpen,
    currentTab,
    selectedTopics,
    preferredFormat,
    closeDeck,
    setTab,
    completeOnboarding,
    skipOnboarding,
    toggleTopic,
    setPreferredFormat,
    markSandboxInteracted,
  } = useOnboarding();

  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Focus preservation
  useEffect(() => {
    if (isDeckOpen) {
      previousActiveElementRef.current = document.activeElement as HTMLElement;
      // Focus first focusable element inside dialog
      setTimeout(() => {
        const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      }, 50);
    } else {
      previousActiveElementRef.current?.focus();
      previousActiveElementRef.current = null;
    }
  }, [isDeckOpen]);

  // Keyboard navigation: Escape to close, Tab trap
  useEffect(() => {
    if (!isDeckOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDeck();
        return;
      }

      if (e.key === "Tab") {
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables || focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDeckOpen, closeDeck]);

  if (!isDeckOpen) return null;

  const currentIndex = TABS.findIndex((t) => t.id === currentTab);
  const isFirstTab = currentIndex === 0;
  const isLastTab = currentIndex === TABS.length - 1;

  const handleNext = () => {
    if (isLastTab) {
      completeOnboarding();
    } else {
      setTab(TABS[currentIndex + 1].id);
    }
  };

  const handlePrev = () => {
    if (!isFirstTab) {
      setTab(TABS[currentIndex - 1].id);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="discovery-deck-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={closeDeck}
        aria-hidden="true"
      />

      {/* Modal Dialog Card */}
      <div
        ref={dialogRef}
        className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header: Title, Tab Pills & Close Button */}
        <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-primary border border-primary/20">
                Discovery Guide
              </span>
              <span className="text-xs text-muted-foreground font-semibold">
                Understanding Over Engagement
              </span>
            </div>
            <h2
              id="discovery-deck-title"
              className="text-lg sm:text-xl font-bold text-foreground"
            >
              How Discora Works
            </h2>
          </div>

          <button
            type="button"
            onClick={closeDeck}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            aria-label="Close discovery guide"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-semibold">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === currentTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTab(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body Content */}
        <div className="min-h-[280px] max-h-[60vh] overflow-y-auto pr-1">
          {/* TAB 1: The Epistemic Model */}
          {currentTab === "model" && (
            <div className="space-y-4 text-xs leading-relaxed">
              <p className="text-muted-foreground text-sm">
                Most platforms encourage fast reactions and popular upvotes. Discora decomposes
                discourse into discrete, verifiable reasoning components:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-blue-400">
                    <HelpCircle className="h-4 w-4" />
                    <span>1. Discussion Questions</span>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    Topic-level exploratory questions framing what the room is trying to understand.
                  </p>
                </div>

                <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-violet-400">
                    <GitBranch className="h-4 w-4" />
                    <span>2. Claims</span>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    Specific testable assertions extracted from contributions, open to verification.
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                    <FileText className="h-4 w-4" />
                    <span>3. Evidence</span>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    Verifiable papers, data, and counterpoints attached to strengthen, weaken, or complicate a claim.
                  </p>
                </div>

                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-amber-400">
                    <Search className="h-4 w-4" />
                    <span>4. Structured Inquiries</span>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    Claim-targeted follow-ups demanding precision, evidence requests, or assumption checks.
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-muted/40 p-3 text-[11px] text-muted-foreground">
                <strong>Key Principle:</strong> Changing your mind when presented with valid
                evidence is an epistemic achievement, not a loss.
              </div>
            </div>
          )}

          {/* TAB 2: Interactive Sandbox ("What Moves the Needle?") */}
          {currentTab === "sandbox" && (
            <EpistemicSandbox onInteract={markSandboxInteracted} />
          )}

          {/* TAB 3: Discussion vs Debate */}
          {currentTab === "modes" && (
            <div className="space-y-4 text-xs leading-relaxed">
              <p className="text-muted-foreground text-sm">
                Discora provides two distinct discourse architectures depending on whether you are
                exploring an open-ended topic or evaluating competing positions.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="rounded-xl border border-border/80 bg-card/40 p-4 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <span>Discussions</span>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    <strong>Collaborative Inquiry:</strong> Explore multifaceted topics together.
                    Participants formulate open questions, extract claims from raw commentary, and
                    attach evidence to build a shared <em>State of Understanding</em>.
                  </p>
                  <div className="pt-2 text-[10px] font-semibold text-primary">
                    Best for: Research questions, technology assessments, nuanced topics.
                  </div>
                </div>

                <div className="rounded-xl border border-border/80 bg-card/40 p-4 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                    <Swords className="h-4 w-4 text-amber-400" />
                    <span>Debates</span>
                  </div>
                  <p className="text-muted-foreground text-[11px]">
                    <strong>Structured Deliberation:</strong> Evaluates a specific motion with
                    Proposition and Opposition arguments. Participants can switch sides when
                    persuaded by evidence, signaling high intellectual integrity.
                  </p>
                  <div className="pt-2 text-[10px] font-semibold text-amber-400">
                    Best for: Concrete policy motions, binary choices, contested propositions.
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border/40 bg-muted/20 p-3 text-[11px] text-muted-foreground">
                In debates, participants do not &ldquo;win points&rdquo; for rhetorical tricks.
                Arguments stand or fall strictly on the strength and relevance of attached evidence.
              </div>
            </div>
          )}

          {/* TAB 4: Personalize Exploration */}
          {currentTab === "interests" && (
            <ExplorationInterestSelector
              selectedTopics={selectedTopics}
              preferredFormat={preferredFormat}
              onToggleTopic={toggleTopic}
              onSelectFormat={setPreferredFormat}
            />
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-4 text-xs font-semibold">
          <button
            type="button"
            onClick={skipOnboarding}
            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Skip Guide
          </button>

          <div className="flex items-center gap-2">
            {!isFirstTab && (
              <button
                type="button"
                onClick={handlePrev}
                className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-2 text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-primary-foreground hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
            >
              <span>{isLastTab ? "Start Exploring" : "Next Step"}</span>
              {isLastTab ? <Check className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
