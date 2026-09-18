"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Share2 } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface ShareButtonProps {
  /** Human-readable title passed to the native share sheet. */
  shareTitle: string;
  /** Optional text passed to the native share sheet. */
  shareText?: string;
  /** Canonical path for this page (no origin), e.g. "/discussions/my-room". */
  sharePath: string;
  /** Accessible label/tooltip, e.g. "Share this debate". */
  ariaLabel?: string;
  className?: string;
  showLabel?: boolean;
}

export function ShareButton({
  shareTitle,
  shareText,
  sharePath,
  ariaLabel = "Share",
  className = "",
  showLabel = false,
}: ShareButtonProps) {
  const [justCopied, setJustCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  const buildShareUrl = () => `${window.location.origin}${sharePath}`;

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setJustCopied(true);
      toast.success("Link copied to clipboard.");
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setJustCopied(false), 2000);
      return true;
    } catch {
      toast.error("Could not copy the link. Please try again.");
      return false;
    }
  };

  const handleShare = async () => {
    const url = buildShareUrl();

    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url });
        // A fulfilled navigator.share() does not guarantee a share UI was
        // actually presented (notably on desktop browsers it can resolve
        // silently with no sheet). Always copy the canonical link too so
        // Share produces a visible "Copied" state + toast in every
        // environment and is never a silent no-op.
        await copyLink(url);
        return;
      } catch (error) {
        // Closing the native share sheet is expected user intent, not an error.
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        // Only fall back to clipboard on a genuine failure.
        await copyLink(url);
      }
      return;
    }

    await copyLink(url);
  };

  const button = (
    <button
      type="button"
      onClick={handleShare}
      aria-label={ariaLabel}
      title={ariaLabel}
      className={cn(
        "relative inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer after:absolute after:-inset-2 after:content-['']",
        justCopied ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground",
        className
      )}
    >
      {justCopied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      {showLabel && <span>{justCopied ? "Copied" : "Share"}</span>}
    </button>
  );

  if (showLabel) return button;

  return (
    <Tooltip content={justCopied ? "Copied to clipboard" : "Share"} side="bottom" align="center">
      {button}
    </Tooltip>
  );
}