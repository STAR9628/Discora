"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FriendListItem } from "./friend-list-item";
import { UsernameLookup } from "./username-lookup";
import {
  useIncomingRequests,
  useOutgoingRequests,
  useFriendList,
  useBlockedList,
  useFriendAction,
} from "../hooks/use-friends";

function Section({
  title,
  description,
  count,
  children,
}: {
  title: string;
  description: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className="rounded-xl border border-border bg-card/50 p-4 sm:p-5">
      <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      <div className="mt-3">
        {count === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
            {children}
          </p>
        ) : (
          <ul className="space-y-2">{children}</ul>
        )}
      </div>
    </section>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  variant = "default",
  testId,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "quiet" | "danger";
  testId?: string;
}) {
  const styles =
    variant === "danger"
      ? "text-destructive hover:bg-destructive/10"
      : variant === "quiet"
        ? "text-muted-foreground hover:text-foreground hover:bg-accent/50"
        : "text-primary hover:bg-primary/10";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${styles}`}
    >
      {label}
    </button>
  );
}

/**
 * Private Friends management surface (Beta). Only the viewer's own data,
 * rendered from owner-scoped reads. No counts-as-status, no graph exposure.
 */
export function FriendsPageClient() {
  const incoming = useIncomingRequests();
  const outgoing = useOutgoingRequests();
  const friends = useFriendList();
  const blocked = useBlockedList();
  const action = useFriendAction();
  const [blockTarget, setBlockTarget] = useState<{ id: string; label: string } | null>(null);

  const busy = action.isPending;
  const incomingRows = incoming.data ?? [];
  const outgoingRows = outgoing.data ?? [];
  const friendRows = friends.data ?? [];
  const blockedRows = blocked.data ?? [];
  const isLoading = incoming.isLoading || outgoing.isLoading || friends.isLoading || blocked.isLoading;

  if (isLoading) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading friends">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-card/50" />
        ))}
      </div>
    );
  }

  const pendingCount = incomingRows.length + outgoingRows.length;

  return (
    <div className="space-y-4 sm:space-y-5">
      <UsernameLookup />

      {/* Activity first on mobile; two calm columns on desktop:
          pending activity | relationships. No feeds, no counts-as-status. */}
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2 lg:items-start">
        <div className="space-y-4 sm:space-y-5">
          <div className="flex items-center gap-2 px-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Activity
            </h3>
            {pendingCount > 0 && (
              <span
                aria-label={`${pendingCount} pending requests`}
                className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/15 px-1.5 text-[11px] font-medium text-primary"
              >
                {pendingCount > 99 ? "99+" : pendingCount}
              </span>
            )}
          </div>
          <Section
            title="Requests for you"
            description="People who would like to connect. Take your time — there is no rush to respond."
            count={incomingRows.length}
          >
        {incomingRows.length === 0 ? (
          <>No incoming requests.</>
        ) : (
          incomingRows.map((req) => (
            <FriendListItem
              key={req.id}
              profile={req.sender}
              fallbackLabel="A Discora member"
              actions={
                <>
                  <ActionButton
                    label="Accept"
                    testId={`accept-${req.id}`}
                    disabled={busy}
                    onClick={() => action.mutate({ kind: "accept", requestId: req.id })}
                  />
                  <ActionButton
                    label="Decline"
                    variant="quiet"
                    testId={`decline-${req.id}`}
                    disabled={busy}
                    onClick={() => action.mutate({ kind: "decline", requestId: req.id })}
                  />
                </>
              }
            />
          ))
        )}
      </Section>

      <Section
        title="Requests you sent"
        description="Requests waiting for a response. You can withdraw one at any time."
        count={outgoingRows.length}
      >
        {outgoingRows.length === 0 ? (
          <>No sent requests.</>
        ) : (
          outgoingRows.map((req) => (
            <FriendListItem
              key={req.id}
              profile={req.recipient}
              fallbackLabel="A Discora member"
              actions={
                <ActionButton
                  label="Withdraw"
                  variant="quiet"
                  testId={`cancel-${req.id}`}
                  disabled={busy}
                  onClick={() => action.mutate({ kind: "cancel", requestId: req.id })}
                />
              }
            />
          ))
        )}
      </Section>

        </div>

        <div className="space-y-4 sm:space-y-5">
          <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Relationships
          </h3>
          <Section
            title="Friends"
            description="People you are connected with. Only you can see this list."
            count={friendRows.length}
          >
        {friendRows.length === 0 ? (
          <>No friends yet.</>
        ) : (
          friendRows.map((entry) => (
            <FriendListItem
              key={entry.friendUserId}
              profile={entry.profile}
              fallbackLabel="A Discora member"
              actions={
                <ActionButton
                  label="Block"
                  variant="quiet"
                  testId={`block-${entry.friendUserId}`}
                  disabled={busy}
                  onClick={() =>
                    setBlockTarget({
                      id: entry.friendUserId,
                      label:
                        entry.profile?.displayName ||
                        (entry.profile ? `@${entry.profile.username}` : "this member"),
                    })
                  }
                />
              }
            />
          ))
        )}
      </Section>

      <Section
        title="Blocked"
        description="Members you have blocked. Blocking removes any connection and prevents new requests. Unblocking does not restore a friendship."
        count={blockedRows.length}
      >
        {blockedRows.length === 0 ? (
          <>No blocked members.</>
        ) : (
          blockedRows.map((entry) => (
            <FriendListItem
              key={entry.blockedUserId}
              profile={entry.profile}
              fallbackLabel="A blocked member"
              actions={
                <ActionButton
                  label="Unblock"
                  variant="quiet"
                  testId={`unblock-${entry.blockedUserId}`}
                  disabled={busy}
                  onClick={() => action.mutate({ kind: "unblock", targetUserId: entry.blockedUserId })}
                />
              }
            />
          ))
        )}
      </Section>
        </div>
      </div>

      <ConfirmDialog
        open={blockTarget !== null}
        title={`Block ${blockTarget?.label ?? "this member"}?`}
        description="Blocking removes your connection and any pending requests, and prevents new requests. If you unblock later, you will need to send a new friend request to reconnect."
        confirmLabel="Block"
        variant="danger"
        onConfirm={() => {
          if (blockTarget) action.mutate({ kind: "block", targetUserId: blockTarget.id });
          setBlockTarget(null);
        }}
        onCancel={() => setBlockTarget(null)}
      />
    </div>
  );
}

export function IncomingRequestsBadge() {
  const incoming = useIncomingRequests();
  const count = incoming.data?.length ?? 0;
  if (!count) return null;
  return (
    <span
      aria-label={`${count} incoming friend requests`}
      className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/15 px-1.5 text-[11px] font-medium text-primary"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
