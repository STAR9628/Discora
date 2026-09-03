import { Trophy, Medal, User } from "lucide-react";
import Link from "next/link";
import type { LeaderboardEntry } from "../types";

interface LeaderboardViewProps {
  title: string;
  entries: LeaderboardEntry[];
  maxEntries?: number;
}

export function LeaderboardView({ title, entries, maxEntries = 10 }: LeaderboardViewProps) {
  const display = entries.slice(0, maxEntries);

  if (display.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">{title}</h3>
        <p className="text-[11px] text-muted-foreground">No entries yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
      <h3 className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">{title}</h3>
      <div className="space-y-1">
        {display.map((entry) => (
          <Link
            key={entry.userId}
            href={`/u/${entry.username}`}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-accent/30 transition-colors"
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center">
              {entry.rank === 1 ? (
                <Trophy className="h-4 w-4 text-amber-400" />
              ) : entry.rank === 2 ? (
                <Medal className="h-4 w-4 text-gray-400" />
              ) : entry.rank === 3 ? (
                <Medal className="h-4 w-4 text-amber-600" />
              ) : (
                <span className="text-[10px] font-mono text-muted-foreground w-4 text-center">{entry.rank}</span>
              )}
            </div>
            {entry.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={entry.avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover shrink-0" />
            ) : (
              <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="h-3 w-3 text-muted-foreground" />
              </div>
            )}
            <span className="flex-1 truncate text-foreground/80 font-medium">@{entry.username}</span>
            <span className="font-mono text-muted-foreground">{entry.score}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
