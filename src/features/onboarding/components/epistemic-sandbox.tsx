"use client";

import { useState } from "react";
import {
  HelpCircle,
  CheckCircle2,
  Scale,
  Sparkles,
  Info,
  Layers,
} from "lucide-react";

interface EpistemicSandboxProps {
  onInteract?: () => void;
}

export function EpistemicSandbox({ onInteract }: EpistemicSandboxProps) {
  const [hasSupporting, setHasSupporting] = useState(false);
  const [hasCounter, setHasCounter] = useState(false);
  const [hasInquiry, setHasInquiry] = useState(false);

  // Compute epistemic state based on attached evidence
  let stateTitle = "Limited Support";
  let stateDescription = "A standalone assertion with minimal verifiable reference data.";
  let badgeColor = "border-amber-500/30 bg-amber-500/10 text-amber-400";

  if (hasSupporting && !hasCounter) {
    stateTitle = "More Supported";
    stateDescription =
      "Empirical field measurements strengthen the plausibility of the assertion.";
    badgeColor = "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  } else if (hasSupporting && hasCounter) {
    stateTitle = "Mixed / Contested";
    stateDescription =
      "Evidence points in competing directions. Neither side has eliminated the other's findings.";
    badgeColor = "border-violet-500/30 bg-violet-500/10 text-violet-400";
  } else if (!hasSupporting && hasCounter) {
    stateTitle = "Weakened by Counter-Evidence";
    stateDescription =
      "Countervailing findings raise significant feasibility doubts against the assertion.";
    badgeColor = "border-rose-500/30 bg-rose-500/10 text-rose-400";
  }

  const handleToggleSupporting = () => {
    setHasSupporting((prev) => !prev);
    onInteract?.();
  };

  const handleToggleCounter = () => {
    setHasCounter((prev) => !prev);
    onInteract?.();
  };

  const handleToggleInquiry = () => {
    setHasInquiry((prev) => !prev);
    onInteract?.();
  };

  return (
    <div className="space-y-4 rounded-2xl border border-border/80 bg-card/60 p-4 sm:p-5 backdrop-blur-sm shadow-sm">
      {/* Explicit Educational Disclaimer */}
      <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">
        <Info className="h-4 w-4 shrink-0" />
        <span>Interactive example — not live Discora data</span>
      </div>

      {/* Core Principle Header */}
      <div className="space-y-1">
        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary" />
          <span>Evidence in Discora: Strengthen, Weaken, or Complicate</span>
        </h4>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Evidence does not manufacture absolute certainty or declare a winner. Watch how
          attaching evidence updates support for a claim.
        </p>
      </div>

      {/* Educational Claim Card */}
      <div className="rounded-xl border border-border/70 bg-background/60 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="rounded-lg border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            Educational Claim
          </span>
          <div
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-0.5 text-[11px] font-bold transition-all duration-300 ${badgeColor}`}
          >
            <Layers className="h-3 w-3" />
            <span>State: {stateTitle}</span>
          </div>
        </div>

        <p className="text-sm font-semibold text-foreground leading-snug">
          &ldquo;Grid-scale battery storage can stabilize regional power grids during extended
          seasonal renewable deficits.&rdquo;
        </p>

        <p className="text-xs text-muted-foreground italic leading-relaxed">
          {stateDescription}
        </p>
      </div>

      {/* Interactive Controls: Toggle Supporting Evidence & Counter-Evidence */}
      <div className="space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Try Toggling Evidence Items
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleToggleSupporting}
            className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all duration-200 cursor-pointer ${
              hasSupporting
                ? "border-emerald-500/40 bg-emerald-500/10 text-foreground shadow-sm"
                : "border-border/60 bg-card/40 text-muted-foreground hover:bg-card/80 hover:text-foreground"
            }`}
          >
            <div
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                hasSupporting
                  ? "border-emerald-500 bg-emerald-500 text-white"
                  : "border-muted-foreground/40 bg-transparent"
              }`}
            >
              {hasSupporting && <CheckCircle2 className="h-3 w-3" />}
            </div>
            <div className="space-y-0.5 text-xs">
              <span className="font-bold block text-foreground">
                + Supporting Evidence
              </span>
              <span className="text-[11px] text-muted-foreground line-clamp-2">
                NREL 2024 Multi-Day Dispatch Study (empirical battery fleet response).
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={handleToggleCounter}
            className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all duration-200 cursor-pointer ${
              hasCounter
                ? "border-rose-500/40 bg-rose-500/10 text-foreground shadow-sm"
                : "border-border/60 bg-card/40 text-muted-foreground hover:bg-card/80 hover:text-foreground"
            }`}
          >
            <div
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                hasCounter
                  ? "border-rose-500 bg-rose-500 text-white"
                  : "border-muted-foreground/40 bg-transparent"
              }`}
            >
              {hasCounter && <CheckCircle2 className="h-3 w-3" />}
            </div>
            <div className="space-y-0.5 text-xs">
              <span className="font-bold block text-foreground">
                + Counter-Evidence
              </span>
              <span className="text-[11px] text-muted-foreground line-clamp-2">
                MIT Energy Analysis: seasonal deficits exceed economic battery duration limits.
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Structured Inquiry Section (Triggered or Revealed) */}
      <div className="space-y-2 pt-2 border-t border-border/40">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Structured Inquiry (Targeted Testing)
          </span>
          <button
            type="button"
            onClick={handleToggleInquiry}
            className="text-xs font-semibold text-primary hover:underline cursor-pointer"
          >
            {hasInquiry ? "Hide Inquiry" : "Show Inquiry Example"}
          </button>
        </div>

        {hasInquiry ? (
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-3.5 space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400">
              <HelpCircle className="h-3.5 w-3.5" />
              <span>Structured Inquiry scoped to this claim</span>
            </div>
            <p className="text-xs text-foreground font-medium leading-relaxed">
              &ldquo;What alternative battery chemistries (e.g., iron-air, flow batteries) avoid
              the lithium and cobalt supply chain bottlenecks identified in the MIT study?&rdquo;
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Notice: A <strong>Discussion Question</strong> frames the overall room topic, whereas a{" "}
              <strong>Structured Inquiry</strong> is attached directly to a specific claim to test
              an assumption or request critical data.
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground/80 leading-relaxed">
            When evidence reveals gaps or conflicting findings, users don&apos;t need to argue. They
            can open a <strong>Structured Inquiry</strong> directly targeting the claim to demand
            clarification or test an assumption.
          </p>
        )}
      </div>

      {/* Epistemic Takeaway Pill */}
      <div className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground flex items-start gap-2">
        <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <span>
          <strong>Discora Takeaway:</strong> You do not need to &ldquo;win&rdquo; an argument. The
          goal is building an accurate map of what current evidence supports, what is contested,
          and what remains unresolved.
        </span>
      </div>
    </div>
  );
}
