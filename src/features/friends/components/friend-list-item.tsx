import Link from "next/link";
import { User } from "lucide-react";
import type { ReactNode } from "react";
import type { CounterpartProfile } from "../services/friend-service";

interface FriendListItemProps {
  profile: CounterpartProfile | null;
  fallbackLabel: string;
  actions?: ReactNode;
}

/**
 * One private relationship row. Renders display name + public avatar only —
 * never counts, history, or graph metadata.
 */
export function FriendListItem({ profile, fallbackLabel, actions }: FriendListItemProps) {
  const label = profile?.displayName || (profile ? `@${profile.username}` : fallbackLabel);
  const body = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
        {profile?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <User className="h-5 w-5 text-muted-foreground" />
        )}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-sm font-medium text-foreground">{label}</span>
        {profile?.displayName && (
          <span className="block truncate text-xs text-muted-foreground">@{profile.username}</span>
        )}
      </span>
    </>
  );

  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
      {profile ? (
        <Link
          href={`/u/${profile.username}`}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg"
        >
          {body}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
      )}
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </li>
  );
}
