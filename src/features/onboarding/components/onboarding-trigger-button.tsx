"use client";

import { Compass } from "lucide-react";
import { useOnboarding } from "../hooks/use-onboarding";

interface OnboardingTriggerButtonProps {
  className?: string;
  compact?: boolean;
}

export function OnboardingTriggerButton({
  className,
  compact = false,
}: OnboardingTriggerButtonProps) {
  const { openDeck } = useOnboarding();

  return (
    <button
      type="button"
      onClick={() => openDeck()}
      className={
        className ||
        "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors cursor-pointer"
      }
      title="How Discora Works"
      aria-label="How Discora Works"
    >
      <Compass className="h-4 w-4 shrink-0 text-primary" />
      {!compact && <span>How Discora Works</span>}
    </button>
  );
}
