"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { toast } from "@/components/ui/toast";
import {
  getRelationshipState,
  listIncomingRequests,
  listOutgoingRequests,
  listFriendships,
  listBlockedUsers,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  cancelFriendRequest,
  blockMember,
  unblockMember,
  type RelationshipState,
} from "../services/friend-service";

export const FRIEND_QUERY_ROOT = ["friends"] as const;

function useViewerId(): string | null {
  const { user, status } = useAuth();
  return status === "authenticated" ? (user?.id ?? null) : null;
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>, userId: string | null) {
  queryClient.invalidateQueries({ queryKey: [...FRIEND_QUERY_ROOT, userId] });
  queryClient.invalidateQueries({ queryKey: [...FRIEND_QUERY_ROOT, "relationship", userId] });
}

export function useIncomingRequests() {
  const userId = useViewerId();
  return useQuery({
    queryKey: [...FRIEND_QUERY_ROOT, userId, "incoming"],
    queryFn: () => listIncomingRequests(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useOutgoingRequests() {
  const userId = useViewerId();
  return useQuery({
    queryKey: [...FRIEND_QUERY_ROOT, userId, "outgoing"],
    queryFn: () => listOutgoingRequests(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useFriendList() {
  const userId = useViewerId();
  return useQuery({
    queryKey: [...FRIEND_QUERY_ROOT, userId, "list"],
    queryFn: () => listFriendships(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useBlockedList() {
  const userId = useViewerId();
  return useQuery({
    queryKey: [...FRIEND_QUERY_ROOT, userId, "blocked"],
    queryFn: () => listBlockedUsers(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });
}

export function useRelationshipState(targetUserId: string | null) {
  const userId = useViewerId();
  return useQuery<RelationshipState>({
    queryKey: [...FRIEND_QUERY_ROOT, "relationship", userId, targetUserId],
    queryFn: () => getRelationshipState(userId!, targetUserId!),
    enabled: !!userId && !!targetUserId,
    staleTime: 15_000,
  });
}

type FriendAction =
  | { kind: "send"; targetUserId: string }
  | { kind: "accept"; requestId: string }
  | { kind: "decline"; requestId: string }
  | { kind: "cancel"; requestId: string }
  | { kind: "block"; targetUserId: string }
  | { kind: "unblock"; targetUserId: string };

const SUCCESS_MESSAGES: Record<FriendAction["kind"], string> = {
  send: "Friend request sent.",
  accept: "You are now friends.",
  decline: "Request declined.",
  cancel: "Request withdrawn.",
  block: "Member blocked. Existing connection and pending requests were removed.",
  unblock: "Member unblocked. A new friend request is needed to reconnect.",
};

/**
 * Single mutation entry point for every friend lifecycle action.
 * All authorization stays in the database RPCs; the UI only surfaces
 * neutral success/error language and refreshes owner-visible state.
 */
export function useFriendAction() {
  const queryClient = useQueryClient();
  const userId = useViewerId();

  return useMutation({
    mutationFn: async (action: FriendAction) => {
      if (!userId) throw new Error("Please sign in and try again.");
      switch (action.kind) {
        case "send":
          await sendFriendRequest(action.targetUserId);
          break;
        case "accept":
          await acceptFriendRequest(action.requestId);
          break;
        case "decline":
          await declineFriendRequest(action.requestId);
          break;
        case "cancel":
          await cancelFriendRequest(action.requestId);
          break;
        case "block":
          await blockMember(action.targetUserId);
          break;
        case "unblock":
          await unblockMember(action.targetUserId);
          break;
      }
      return action.kind;
    },
    onSuccess: (kind) => {
      toast.success(SUCCESS_MESSAGES[kind]);
      invalidateAll(queryClient, userId);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.");
      invalidateAll(queryClient, userId);
    },
  });
}
