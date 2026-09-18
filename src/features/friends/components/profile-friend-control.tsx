"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getPendingBetween } from "../services/friend-service";
import {
  FRIEND_QUERY_ROOT,
  useRelationshipState,
  useFriendAction,
} from "../hooks/use-friends";

const QUIET_BTN =
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 text-muted-foreground hover:bg-accent/50 hover:text-foreground";

/**
 * Standalone safety action: available from every non-blocked state so a member
 * can be blocked without a prior connection (e.g. harassment prevention).
 */
function ProfileBlockButton({
  targetUserId,
  targetLabel,
  busy,
}: {
  targetUserId: string;
  targetLabel: string;
  busy: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const action = useFriendAction();
  return (
    <>
      <button
        type="button"
        disabled={busy}
        data-testid="profile-block-member"
        onClick={() => setConfirmOpen(true)}
        className={QUIET_BTN}
      >
        Block
      </button>
      <ConfirmDialog
        open={confirmOpen}
        title={`Block ${targetLabel}?`}
        description="Blocking removes your connection and any pending requests, and prevents new requests. If you unblock later, you will need to send a new friend request to reconnect."
        confirmLabel="Block"
        variant="danger"
        onConfirm={() => {
          action.mutate({ kind: "block", targetUserId });
          setConfirmOpen(false);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

/**
 * Relationship controls on a member's profile (Step 9).
 * State-aware: never shows an action the backend would reject without reason.
 * Hidden for guests and on one's own profile. Never in composers.
 */
export function ProfileFriendControl({
  targetUserId,
  targetLabel,
}: {
  targetUserId: string;
  targetLabel: string;
}) {
  const { user, status } = useAuth();
  const viewerId = status === "authenticated" ? (user?.id ?? null) : null;
  const relationship = useRelationshipState(viewerId ? targetUserId : null);
  const action = useFriendAction();

  const pending = useQuery({
    queryKey: [...FRIEND_QUERY_ROOT, "pending-between", viewerId, targetUserId],
    queryFn: () => getPendingBetween(viewerId!, targetUserId),
    enabled:
      !!viewerId &&
      (relationship.data === "request_sent" || relationship.data === "request_received"),
    staleTime: 15_000,
  });

  if (status !== "authenticated" || !viewerId) return null;
  if (relationship.isLoading) {
    return (
      <div
        aria-label="Loading connection status"
        className="h-9 w-28 animate-pulse rounded-lg bg-muted"
      />
    );
  }

  const state = relationship.data;
  if (!state || state === "self") return null;
  const busy = action.isPending;
  const requestId = pending.data?.id ?? null;

  const btn =
    "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50";

  if (state === "not_connected") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          data-testid="profile-add-friend"
          onClick={() => action.mutate({ kind: "send", targetUserId })}
          className={`${btn} bg-primary px-4 font-semibold text-primary-foreground hover:opacity-90`}
        >
          Add Friend
        </button>
        <ProfileBlockButton targetUserId={targetUserId} targetLabel={targetLabel} busy={busy} />
      </div>
    );
  }

  if (state === "request_sent") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex min-h-9 items-center rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
          Request sent
        </span>
        <button
          type="button"
          disabled={busy || !requestId}
          data-testid="profile-withdraw-request"
          onClick={() => requestId && action.mutate({ kind: "cancel", requestId })}
          className={`${btn} text-muted-foreground hover:bg-accent/50 hover:text-foreground`}
        >
          Withdraw
        </button>
        <ProfileBlockButton targetUserId={targetUserId} targetLabel={targetLabel} busy={busy} />
      </div>
    );
  }

  if (state === "request_received") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy || !requestId}
          data-testid="profile-accept-request"
          onClick={() => requestId && action.mutate({ kind: "accept", requestId })}
          className={`${btn} bg-primary px-4 font-semibold text-primary-foreground hover:opacity-90`}
        >
          Accept request
        </button>
        <button
          type="button"
          disabled={busy || !requestId}
          data-testid="profile-decline-request"
          onClick={() => requestId && action.mutate({ kind: "decline", requestId })}
          className={`${btn} text-muted-foreground hover:bg-accent/50 hover:text-foreground`}
        >
          Decline
        </button>
        <ProfileBlockButton targetUserId={targetUserId} targetLabel={targetLabel} busy={busy} />
      </div>
    );
  }

  if (state === "friends") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex min-h-9 items-center rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
          Friends
        </span>
        <ProfileBlockButton targetUserId={targetUserId} targetLabel={targetLabel} busy={busy} />
      </div>
    );
  }

  // blocked_by_me
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex min-h-9 items-center rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
        Blocked
      </span>
      <button
        type="button"
        disabled={busy}
        data-testid="profile-unblock-member"
        onClick={() => action.mutate({ kind: "unblock", targetUserId })}
        className={`${btn} text-muted-foreground hover:bg-accent/50 hover:text-foreground`}
      >
        Unblock
      </button>
    </div>
  );
}
