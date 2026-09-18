import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createDebate, getDebateByRoomId, getDebates, joinDebate, leaveDebate, getDebateParticipants, getClaimsBySide, switchDebateSide, getSideChangeHistory, createPrivateDebate, createRoomInvitation, setRoomAccessCode, removeDebateParticipant, publishDebateRoom, acceptInvitation, joinWithAccessCode, getRoomInvitations, revokeRoomInvitation, setParticipantInvitesEnabled, roomHasAccessCode } from "@/features/debates/services/debate-service";
import type { DebateSortOption, DebateFeedItem } from "@/features/debates/services/debate-service";
import type { DiscussionClaim } from "@/features/discussions/types";
import { useState, useCallback } from "react";

export function useDebates(
  statusFilter: "active" | "closing_soon" = "active",
  sort: DebateSortOption = "most_active",
) {
  const [items, setItems] = useState<DebateFeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const query = useQuery({
    queryKey: ["debates", "browse", { statusFilter, sort }],
    queryFn: async () => {
      const page = await getDebates(statusFilter, sort, null);
      setItems(page.items);
      setCursor(page.nextCursor);
      setHasMore(page.nextCursor !== null);
      return page;
    },
    staleTime: 30_000,
  });

  const loadMore = useCallback(async () => {
    if (!cursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const page = await getDebates(statusFilter, sort, cursor);
      setItems((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
      setHasMore(page.nextCursor !== null);
    } finally {
      setIsLoadingMore(false);
    }
  }, [cursor, isLoadingMore, statusFilter, sort]);

  return {
    data: query.data,
    items,
    isLoading: query.isLoading,
    error: query.error,
    hasMore,
    isLoadingMore,
    loadMore,
  };
}

export function useCreateDebate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      topicId: string;
      openingStatement: string;
    }) => createDebate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discussions"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["debates"] });
    },
  });
}


export function useDebate(roomId: string) {
  return useQuery({
    queryKey: ["debate", roomId],
    queryFn: () => getDebateByRoomId(roomId),
    enabled: !!roomId,
    staleTime: 30_000,
  });
}

export function useJoinDebate(roomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (side: "proposition" | "opposition" | "neutral") => joinDebate(roomId, side),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debateParticipants", roomId] });
      queryClient.invalidateQueries({ queryKey: ["debate", roomId] });
    },
  });
}

export function useLeaveDebate(roomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => leaveDebate(roomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debateParticipants", roomId] });
      queryClient.invalidateQueries({ queryKey: ["debate", roomId] });
    },
  });
}

export function useDebateParticipants(roomId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["debateParticipants", roomId],
    queryFn: () => getDebateParticipants(roomId),
    enabled: !!roomId && enabled,
    staleTime: 30_000,
  });
}

export function useDebateClaimsBySide(
  roomId: string,
  side: "proposition" | "opposition",
  initialData?: DiscussionClaim[],
) {
  return useQuery({
    queryKey: ["debateClaims", roomId, side],
    queryFn: () => getClaimsBySide(roomId, side),
    enabled: !!roomId,
    staleTime: 30_000,
    initialData,
  });
}

export function useSwitchDebateSide(roomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      newSide: "proposition" | "opposition";
      reason: string;
    }) => switchDebateSide(roomId, data.newSide, data.reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debateParticipants", roomId] });
      queryClient.invalidateQueries({ queryKey: ["debate", roomId] });
      queryClient.invalidateQueries({ queryKey: ["messages", roomId] });
      queryClient.invalidateQueries({ queryKey: ["sideChangeHistory", roomId] });
    },
  });
}

export function useSideChangeHistory(roomId: string, userId?: string) {
  return useQuery({
    queryKey: ["sideChangeHistory", roomId, userId],
    queryFn: () => getSideChangeHistory(roomId, userId!),
    enabled: !!roomId && !!userId,
    staleTime: 30_000,
  });
}

export { useSwitchDebateSide as useSwitchSide };

import type { RoomInvitation } from "@/features/debates/services/debate-service";

export function useCreatePrivateDebate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      topicId: string;
      propositionTitle: string;
      oppositionTitle: string;
      openingStatement: string;
    }) => createPrivateDebate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discussions"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["debates"] });
    },
  });
}

export function useCreateRoomInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { roomId: string; invitedUserId?: string; invitedEmail?: string }) =>
      createRoomInvitation(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["roomInvitations", variables.roomId] });
    },
  });
}

export function useSetRoomAccessCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { roomId: string; code: string }) => setRoomAccessCode(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["room", variables.roomId] });
      queryClient.invalidateQueries({ queryKey: ["room", variables.roomId, "hasAccessCode"] });
    },
  });
}

export function useRemoveDebateParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { roomId: string; userId: string }) => removeDebateParticipant(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["debateParticipants", variables.roomId] });
      queryClient.invalidateQueries({ queryKey: ["debate", variables.roomId] });
    },
  });
}

export function usePublishDebateRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roomId: string) => publishDebateRoom(roomId),
    onSuccess: (_, roomId) => {
      queryClient.invalidateQueries({ queryKey: ["room", roomId] });
      queryClient.invalidateQueries({ queryKey: ["debate", roomId] });
      queryClient.invalidateQueries({ queryKey: ["debates"] });
      queryClient.invalidateQueries({ queryKey: ["roomInvitations", roomId] });
    },
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { roomId: string; invitationToken: string }) => acceptInvitation(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["debateParticipants", variables.roomId] });
      queryClient.invalidateQueries({ queryKey: ["roomInvitations", variables.roomId] });
    },
  });
}

export function useJoinWithAccessCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { roomId: string; code: string }) => joinWithAccessCode(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["debateParticipants", variables.roomId] });
      queryClient.invalidateQueries({ queryKey: ["debate", variables.roomId] });
    },
  });
}

export function useRoomInvitations(roomId: string) {
  return useQuery({
    queryKey: ["roomInvitations", roomId],
    queryFn: () => getRoomInvitations(roomId),
    enabled: !!roomId,
    staleTime: 30_000,
  });
}

export function useRevokeRoomInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { invitationId: string; roomId: string }) => revokeRoomInvitation(data.invitationId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["roomInvitations", variables.roomId] });
    },
  });
}

export function useRoomHasAccessCode(roomId: string) {
  return useQuery({
    queryKey: ["room", roomId, "hasAccessCode"],
    queryFn: () => roomHasAccessCode(roomId),
    enabled: !!roomId,
    staleTime: 30_000,
  });
}

export function useSetParticipantInvitesEnabled() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { roomId: string; enabled: boolean }) => setParticipantInvitesEnabled(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["room", variables.roomId] });
      queryClient.invalidateQueries({ queryKey: ["debate", variables.roomId] });
    },
  });
}

export { RoomInvitation };
