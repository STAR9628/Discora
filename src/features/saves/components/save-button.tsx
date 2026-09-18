"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bookmark, Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { Tooltip } from "@/components/ui/tooltip";
import { useToggleSave } from "../hooks/use-saves";
import type { SaveTargetType } from "../types";

interface SaveButtonProps {
  targetType: SaveTargetType;
  targetId: string;
  className?: string;
  showLabel?: boolean;
}

export function SaveButton({ targetType, targetId, className = "", showLabel = false }: SaveButtonProps) {
  const { status } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { isSaved, isLoading, toggle } = useToggleSave(targetType, targetId);

  const handleClick = () => {
    if (status !== "authenticated") {
      setIsRedirecting(true);
      const currentPath = encodeURIComponent(pathname || "/");
      router.push(`/login?redirectedFrom=${currentPath}`);
      return;
    }
    toggle();
  };

  const wrapWithTooltip = (element: React.ReactElement, content: string) => {
    if (showLabel) return element;
    return (
      <Tooltip content={content} side="bottom" align="center">
        {element}
      </Tooltip>
    );
  };

  if (status !== "authenticated" && !isRedirecting) {
    const unauthButton = (
      <button
        type="button"
        onClick={handleClick}
        className={`relative inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer after:absolute after:-inset-2 after:content-[''] ${className}`}
        aria-label="Save to your library"
      >
        <Bookmark className="h-4 w-4" />
        {showLabel && <span>Save</span>}
      </button>
    );
    return wrapWithTooltip(unauthButton, "Save to your library");
  }

  if (isRedirecting) {
    return (
      <button
        type="button"
        disabled
        aria-label="Signing in..."
        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground cursor-not-allowed opacity-70 ${className}`}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        {showLabel && <span>Signing in...</span>}
      </button>
    );
  }

  const tooltipLabel = isSaved ? "Remove from your library" : "Save to your library";

  const button = (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      aria-pressed={isSaved}
      aria-label={tooltipLabel}
      className={`relative inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 after:absolute after:-inset-2 after:content-[''] ${
        isSaved
          ? "text-primary bg-primary/10"
          : "text-muted-foreground hover:text-foreground"
      } ${className}`}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
      )}
      {showLabel && <span>{isSaved ? "Saved" : "Save"}</span>}
    </button>
  );

  return wrapWithTooltip(button, tooltipLabel);
}
