"use client";

import React from "react";
import { User } from "lucide-react";
import type { TypingUser } from "../hooks/use-typing-indicator";

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
  className?: string;
}

export function TypingIndicator({ typingUsers, className = "" }: TypingIndicatorProps) {
  if (!typingUsers || typingUsers.length === 0) return null;

  const names = typingUsers.map((u) => u.username).slice(0, 3).join(", ");
  const extraCount = typingUsers.length > 3 ? typingUsers.length - 3 : 0;
  const label = extraCount > 0 ? `${names} + ${extraCount} more` : names;

  return (
    <div
      data-testid="room-typing-indicator"
      className={`mb-2 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/90 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150 ${className}`}
    >
      {/* Avatar or stacked avatars */}
      <div className="flex -space-x-1.5 items-center">
        {typingUsers.slice(0, 2).map((u) => (
          <div
            key={u.userId}
            className="h-4 w-4 rounded-full border border-background bg-muted overflow-hidden flex items-center justify-center shrink-0"
          >
            {u.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={u.avatarUrl} alt={u.username} className="h-full w-full object-cover" />
            ) : (
              <User className="h-2.5 w-2.5 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      <span className="font-semibold text-[11px] text-foreground/85 truncate max-w-[160px] sm:max-w-[220px]">
        {label}
      </span>

      {/* 3 subtle bouncing chat dots */}
      <div className="flex items-center gap-1 pl-0.5">
        <span
          className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-bounce"
          style={{ animationDelay: "0ms", animationDuration: "900ms" }}
        />
        <span
          className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-bounce"
          style={{ animationDelay: "150ms", animationDuration: "900ms" }}
        />
        <span
          className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-bounce"
          style={{ animationDelay: "300ms", animationDuration: "900ms" }}
        />
      </div>
    </div>
  );
}
