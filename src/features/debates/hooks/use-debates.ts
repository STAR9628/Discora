import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createDebate, getDebateByRoomId, getDebates, joinDebate, leaveDebate, getDebateParticipants, getClaimsBySide, resolveDebate, switchDebateSide, getSideChangeHistory } from "@/features/debates/services/debate-service";
import type { DebateSortOption, DebateFeedItem } from "@/features/debates/services/debate-service";
import { useState, useCallback } from "react";

export function useDebates(
  statusFilter: "active" | "resolved" | "closing_soon" = "active",
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

export function useDebateParticipants(roomId: string) {
  return useQuery({
    queryKey: ["debateParticipants", roomId],
    queryFn: () => getDebateParticipants(roomId),
    enabled: !!roomId,
    staleTime: 30_000,
  });
}

export function useDebateClaimsBySide(roomId: string, side: "proposition" | "opposition") {
  return useQuery({
    queryKey: ["debateClaims", roomId, side],
    queryFn: () => getClaimsBySide(roomId, side),
    enabled: !!roomId,
    staleTime: 30_000,
  });
}

export function useResolveDebate(roomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (resolution: {
      winner: "proposition" | "opposition" | "draw";
      summary: string;
      resolvedBy: string;
    }) => resolveDebate(roomId, resolution),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debate", roomId] });
      queryClient.invalidateQueries({ queryKey: ["debates"] });
    },
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

export { useSwitchDebateSide as useSwitchSide };

export function useSideChangeHistory(roomId: string, userId?: string) {
  return useQuery({
    queryKey: ["sideChangeHistory", roomId, userId],
    queryFn: () => getSideChangeHistory(roomId, userId!),
    enabled: !!roomId && !!userId,
    staleTime: 30_000,
  });
}
