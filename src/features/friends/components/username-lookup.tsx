"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Search, Loader2, User } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import {
  FRIEND_QUERY_ROOT,
  useFriendAction,
  useRelationshipState,
  useUsernameLookup,
} from "../hooks/use-friends";
import { getPendingBetween } from "../services/friend-service";

const BTN =
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50";

/**
 * "Find someone" — exact-username lookup that reuses the secure friend
 * request lifecycle. One normalized username in, at most one member out:
 * the lookup cannot enumerate members or expose the friends graph.
 */
export function UsernameLookup() {
  const { user, status } = useAuth();
  const viewerId = status === "authenticated" ? (user?.id ?? null) : null;
  const [input, setInput] = useState("");
  const lookup = useUsernameLookup();
  const action = useFriendAction();

  const foundId = lookup.result?.profile?.id ?? null;
  const relationship = useRelationshipState(viewerId && foundId ? foundId : null);
  const pending = useQuery({
    queryKey: [...FRIEND_QUERY_ROOT, "pending-between", viewerId, foundId],
    queryFn: () => getPendingBetween(viewerId!, foundId!),
    enabled:
      !!viewerId &&
      !!foundId &&
      (relationship.data === "request_sent" || relationship.data === "request_received"),
    staleTime: 15_000,
  });

  if (status !== "authenticated" || !viewerId) return null;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (lookup.isSearching || action.isPending) return;
    void lookup.search(input);
  };

  const busy = lookup.isSearching || action.isPending;
  const profile = lookup.result?.profile ?? null;
  const state = relationship.data;
  const requestId = pending.data?.id ?? null;

  return (
    <section
      aria-label="Find someone"
      className="rounded-xl border border-border bg-card/50 p-4 sm:p-5"
    >
      <h2 className="text-base font-semibold tracking-tight text-foreground">Find someone</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">
        Enter their exact Discora username to send a friend request.
      </p>

      <form onSubmit={onSubmit} className="mt-3 flex gap-2">
        <label htmlFor="friend-username-lookup" className="sr-only">
          Username
        </label>
        <div className="relative min-w-0 flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            id="friend-username-lookup"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. qatester012"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            disabled={busy}
            className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ring disabled:opacity-60"
          />
        </div>
        <button
          type="submit"
          disabled={busy || input.trim().length === 0}
          data-testid="username-lookup-search"
          className={`${BTN} shrink-0 bg-primary font-semibold text-primary-foreground hover:opacity-90`}
        >
          {lookup.isSearching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Search
        </button>
      </form>

      {lookup.searchError && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {lookup.searchError}
        </p>
      )}

      {lookup.result && !profile && !lookup.searchError && (
        <p className="mt-3 rounded-lg border border-dashed border-border px-3 py-3 text-center text-sm text-muted-foreground">
          No member found with the username{" "}
          <span className="font-medium text-foreground">@{lookup.result.normalized}</span>.
          Double-check the spelling and try again.
        </p>
      )}

      {profile && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5">
          <Link
            href={`/u/${profile.username}`}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-lg"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <User className="h-5 w-5 text-muted-foreground" />
              )}
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-sm font-medium text-foreground">
                {profile.displayName || `@${profile.username}`}
              </span>
              {profile.displayName && (
                <span className="block truncate text-xs text-muted-foreground">
                  @{profile.username}
                </span>
              )}
            </span>
          </Link>

          <div className="flex shrink-0 items-center">
            {relationship.isLoading || !state ? (
              <span
                aria-label="Loading connection status"
                className="h-9 w-24 animate-pulse rounded-lg bg-muted"
              />
            ) : state === "self" ? (
              <span className="inline-flex min-h-9 items-center rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
                That&rsquo;s you
              </span>
            ) : state === "not_connected" ? (
              <button
                type="button"
                disabled={busy}
                data-testid="lookup-add-friend"
                onClick={() => action.mutate({ kind: "send", targetUserId: profile.id })}
                className={`${BTN} bg-primary font-semibold text-primary-foreground hover:opacity-90`}
              >
                {action.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Add Friend
              </button>
            ) : state === "request_sent" ? (
              <>
                <span className="inline-flex min-h-9 items-center rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                  Request sent
                </span>
                <button
                  type="button"
                  disabled={busy || !requestId}
                  onClick={() => requestId && action.mutate({ kind: "cancel", requestId })}
                  className={`${BTN} ml-2 text-muted-foreground hover:bg-accent/50 hover:text-foreground`}
                >
                  Withdraw
                </button>
              </>
            ) : state === "request_received" ? (
              <>
                <button
                  type="button"
                  disabled={busy || !requestId}
                  onClick={() => requestId && action.mutate({ kind: "accept", requestId })}
                  className={`${BTN} bg-primary font-semibold text-primary-foreground hover:opacity-90`}
                >
                  Accept
                </button>
                <button
                  type="button"
                  disabled={busy || !requestId}
                  onClick={() => requestId && action.mutate({ kind: "decline", requestId })}
                  className={`${BTN} ml-2 text-muted-foreground hover:bg-accent/50 hover:text-foreground`}
                >
                  Decline
                </button>
              </>
            ) : state === "friends" ? (
              <span className="inline-flex min-h-9 items-center rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                Friends
              </span>
            ) : (
              <span className="inline-flex min-h-9 items-center rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
                Unavailable
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
