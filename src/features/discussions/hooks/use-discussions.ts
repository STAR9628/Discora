import { useMutation, useQuery, useQueryClient, useInfiniteQuery, type QueryClient } from "@tanstack/react-query";
import { useState, useCallback, useMemo } from "react";
import { getTopics, createDiscussion, getDiscussions, getMessages, postMessage, updateMessage, getClaims, createClaim, retractClaim, retractEvidence, getEvidenceForClaim, createEvidence, getEvidenceForRoom, castClaimVote, castEvidenceVote, encodeDiscussionFeedCursor, getQuestions, createQuestion, retractQuestion, flagEntity, getPendingFlags, getModerationHistory, resolveFlag, getClaimRelations, createClaimRelation, deleteClaimRelation, getClaimsPaginated, getClaimsMinimal, getClaimById, getClaimsByIds, getEvidencePaginated, getEvidenceById, getMessagesPaginated, getMessageById, getMessageRoots, getMessageSubtreeDescendants, getRoomMessageCount, resolveMessageThread, getQuestionsPaginated, getQuestionById, getEvidenceMetadataForRoom, getClaimRelationCounts } from "@/features/discussions/services/discussion-service";
import type { QuestionType, ClaimContextType } from "@/types/domain";
import type { ClaimRelationType, DiscussionClaim, DiscussionEvidence, DiscussionMessage, DiscussionQuestion } from "@/features/discussions/types";

/**
 * Invalidate every cache shape for a room-scoped section query, covering both the
 * legacy full list keys and the paginated keys so mutations refresh both.
 */
export function invalidateRoomQueries(
  queryClient: QueryClient,
  prefix: string,
  roomId: string,
) {
  queryClient.invalidateQueries({ queryKey: [prefix, roomId] });
  queryClient.invalidateQueries({ queryKey: [prefix, "paginated", roomId] });
  queryClient.invalidateQueries({ queryKey: [prefix, "minimal", roomId] });
}


/**
 * Hook to retrieve all seeded topics
 */
export function useTopics() {
  return useQuery({
    queryKey: ["topics"],
    queryFn: () => getTopics(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Mutation hook to create a new discussion
 */
export function useCreateDiscussion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      title: string;
      description?: string;
      topicId: string;
      openingStatement: string;
      summary?: string;
    }) => createDiscussion(data),
    onSuccess: () => {
      // Invalidate discussions lists/caches
      queryClient.invalidateQueries({ queryKey: ["discussions"] });
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

/**
 * Hook to retrieve paginated discussions with optional topic filtering
 */
export function useInfiniteDiscussions(topicId?: string, limit: number = 10) {
  return useInfiniteQuery({
    queryKey: ["discussions", "feed", { topicId, limit }],
    queryFn: ({ pageParam }) => getDiscussions(limit, pageParam, topicId),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < limit) return undefined;
      const last = lastPage[lastPage.length - 1];
      if (!last) return undefined;
      return encodeDiscussionFeedCursor(last.room.createdAt, last.room.id);
    },
    staleTime: 30_000,
  });
}

/**
 * Hook to retrieve messages for a discussion room
 */
export function useMessages(roomId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["messages", roomId],
    queryFn: () => getMessages(roomId),
    enabled: !!roomId && enabled,
    staleTime: 30_000,
  });
}

/**
 * Total contribution count for a room (head-only exact count, room-scoped).
 */
export function useRoomMessageCount(roomId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["messages", roomId, "count"],
    queryFn: () => getRoomMessageCount(roomId),
    enabled: !!roomId && enabled,
    staleTime: 30_000,
  });
}

/**
 * Mutation hook to post a new message or nested reply
 */
export function usePostMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      roomId: string;
      parentMessageId?: string | null;
      content: string;
      identityMode: "public" | "anonymous";
    }) => postMessage(data),
    onSuccess: (_, variables) => {
      // Invalidate messages for this specific room (legacy + paginated + minimal)
      invalidateRoomQueries(queryClient, "messages", variables.roomId);
    },
  });
}

/**
 * Mutation hook to edit an existing message
 */
export function useUpdateMessage(roomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; content: string }) => updateMessage(data.id, data.content),
    onSuccess: () => {
      // Invalidate messages for this specific room
      invalidateRoomQueries(queryClient, "messages", roomId);
    },
  });
}

/**
 * Hook to retrieve questions for a room
 */
export function useQuestions(roomId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["questions", roomId],
    queryFn: () => getQuestions(roomId),
    enabled: !!roomId && enabled,
    staleTime: 30_000,
  });
}

/**
 * Mutation hook to create/ask a question
 */
export function useCreateQuestion(roomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      roomId: string;
      content: string;
      questionType: QuestionType;
      identityMode: "public" | "anonymous";
    }) => createQuestion(data),
    onSuccess: () => {
      invalidateRoomQueries(queryClient, "questions", roomId);
    },
  });
}

/**
 * Mutation hook to retract a question
 */
export function useRetractQuestion(roomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => retractQuestion(id),
    onSuccess: () => {
      invalidateRoomQueries(queryClient, "questions", roomId);
    },
  });
}

/**
 * Hook to retrieve claims for a discussion room
 */
export function useClaims(roomId: string, questionId?: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: ["claims", roomId, { questionId }],
    queryFn: () => getClaims(roomId, questionId),
    enabled: !!roomId && enabled,
    staleTime: 30_000,
  });
}

/**
 * Mutation hook to create a new claim or extract a claim from a comment
 */
export function useCreateClaim(roomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      roomId: string;
      content: string;
      claimType: "fact" | "opinion" | "prediction" | "proposal" | "observation";
      contextType: ClaimContextType;
      identityMode: "public" | "anonymous";
      originMessageId?: string | null;
      questionId?: string | null;
      debateSide?: "proposition" | "opposition" | null;
    }) => createClaim(data),
    onSuccess: () => {
      // Invalidate claims list (legacy + paginated + minimal)
      invalidateRoomQueries(queryClient, "claims", roomId);
    },
  });
}

/**
 * Mutation hook to retract a claim
 */
export function useRetractClaim(roomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => retractClaim(id),
    onSuccess: () => {
      // Invalidate claims list
      invalidateRoomQueries(queryClient, "claims", roomId);
    },
  });
}

/**
 * Hook to retrieve evidence for a claim
 */
export function useEvidence(claimId: string) {
  return useQuery({
    queryKey: ["evidence", claimId],
    queryFn: () => getEvidenceForClaim(claimId),
    enabled: !!claimId,
    staleTime: 30_000,
  });
}

/**
 * Mutation hook to create evidence for a claim
 */
export function useCreateEvidence(roomId: string, claimId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      content: string;
      evidenceType: "scientific" | "statistical" | "documentary" | "visual" | "experiential" | "expert" | "historical" | "logical" | "ethical" | "cultural";
      identityMode: "public" | "anonymous";
      direction: "support" | "contradict" | "context";
      sourceTitle: string;
      sourceUrl: string;
    }) => createEvidence(roomId, claimId, data),
    onSuccess: () => {
      // Invalidate both the claims and evidence queries for this claim
      invalidateRoomQueries(queryClient, "claims", roomId);
      invalidateRoomQueries(queryClient, "roomEvidence", roomId);
      invalidateRoomQueries(queryClient, "claimRelations", roomId);
      queryClient.invalidateQueries({ queryKey: ["evidence", claimId] });
    },
  });
}

/**
 * Mutation hook to retract evidence.
 * Invalidates all caches that display evidence state:
 * - room-wide evidence bibliography
 * - per-claim evidence list
 * - claim list (evidence counts / retraction badges)
 */
export function useRetractEvidence(roomId: string, claimId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => retractEvidence(id),
    onSuccess: () => {
      invalidateRoomQueries(queryClient, "roomEvidence", roomId);
      invalidateRoomQueries(queryClient, "claims", roomId);
      queryClient.invalidateQueries({ queryKey: ["evidence", claimId] });
    },
  });
}

/**
 * Hook to retrieve all evidence for a discussion room
 */
export function useRoomEvidence(roomId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["roomEvidence", roomId],
    queryFn: () => getEvidenceForRoom(roomId),
    enabled: !!roomId && enabled,
    staleTime: 30_000,
  });
}

/**
 * Section-owned query contracts. They deliberately preserve the existing domain
 * shapes while giving route components a stable boundary for Phase 2 pagination.
 */
export const useDiscussionClaims = useClaims;
export const useDiscussionEvidence = useRoomEvidence;
export const useDiscussionContributions = useMessages;

/**
 * Lightweight room evidence metadata hook — fetches only the columns ClaimList reads.
 */
export function useEvidenceMetadata(roomId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["roomEvidence", "minimal", roomId],
    queryFn: () => getEvidenceMetadataForRoom(roomId),
    enabled: !!roomId && enabled,
    staleTime: 30_000,
  });
}

/**
 * Lightweight claim relation counts hook — fetches only the columns ClaimList needs
 * to compute per-claim relation counts.
 */
export function useClaimRelationCounts(roomId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["claimRelations", "minimal", roomId],
    queryFn: () => getClaimRelationCounts(roomId),
    enabled: !!roomId && enabled,
    staleTime: 30_000,
  });
}

/**
 * Legacy hook name kept for backwards compatibility with any existing callers of
 * the full claim-relations query. New code should prefer useClaimRelationCounts.
 * `enabled` lets callers defer the heavier full-content query until it is needed.
 */
export function useClaimRelations(roomId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["claimRelations", roomId],
    queryFn: () => getClaimRelations(roomId),
    enabled: !!roomId && enabled,
  });
}

/**
 * Mutation hook to vote on a claim
 */
export function useVoteClaim(roomId: string, claimId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (voteType: "agree" | "disagree" | null) =>
      castClaimVote(claimId, voteType),
    onSuccess: () => {
      invalidateRoomQueries(queryClient, "claims", roomId);
    },
  });
}

/**
 * Mutation hook to vote on evidence
 */
export function useVoteEvidence(roomId: string, claimId: string, evidenceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (voteType: "agree" | "disagree" | null) =>
      castEvidenceVote(evidenceId, voteType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evidence", claimId] });
      invalidateRoomQueries(queryClient, "roomEvidence", roomId);
    },
  });
}

/**
 * Mutation hook to report/flag an entity
 */
export function useFlagEntity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      messageId?: string | null;
      questionId?: string | null;
      claimId?: string | null;
      evidenceId?: string | null;
      inquiryId?: string | null;
      reason: string;
      roomId?: string;
    }) => flagEntity(data),
    onSuccess: (_, variables) => {
      if (variables.roomId) {
        invalidateRoomQueries(queryClient, "messages", variables.roomId);
        invalidateRoomQueries(queryClient, "questions", variables.roomId);
        invalidateRoomQueries(queryClient, "claims", variables.roomId);
        invalidateRoomQueries(queryClient, "roomEvidence", variables.roomId);
      }
      queryClient.invalidateQueries({ queryKey: ["pendingFlags"] });
    },
  });
}

/**
 * Hook to retrieve all pending moderation flags (moderator-only)
 */
export function usePendingFlags() {
  return useQuery({
    queryKey: ["pendingFlags"],
    queryFn: () => getPendingFlags(),
  });
}

/**
 * Hook to retrieve resolved moderation history (moderator-only)
 */
export function useModerationHistory() {
  return useQuery({
    queryKey: ["moderationHistory"],
    queryFn: () => getModerationHistory(),
  });
}

/**
 * Mutation hook to resolve a pending moderation flag
 */
export function useResolveFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: {
      id: string;
      status: "resolved_hidden" | "resolved_dismissed" | "resolved_restored";
    }) => resolveFlag(variables.id, variables.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      queryClient.invalidateQueries({ queryKey: ["claims"] });
      queryClient.invalidateQueries({ queryKey: ["evidence"] });
      queryClient.invalidateQueries({ queryKey: ["roomEvidence"] });
      queryClient.invalidateQueries({ queryKey: ["pendingFlags"] });
      queryClient.invalidateQueries({ queryKey: ["moderationHistory"] });
    },
  });
}

/**
 * Mutation hook to create a new claim relation
 */
export function useCreateClaimRelation(roomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      sourceClaimId: string;
      targetClaimId: string;
      relationType: ClaimRelationType;
    }) => createClaimRelation(roomId, data.sourceClaimId, data.targetClaimId, data.relationType),
    onSuccess: () => {
      invalidateRoomQueries(queryClient, "claimRelations", roomId);
      invalidateRoomQueries(queryClient, "claims", roomId);
    },
  });
}

/**
 * Mutation hook to delete a claim relation
 */
export function useDeleteClaimRelation(roomId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteClaimRelation(id),
    onSuccess: () => {
      invalidateRoomQueries(queryClient, "claimRelations", roomId);
      invalidateRoomQueries(queryClient, "claims", roomId);
    },
  });
}

// ─────────────────────────────────────────────────────
// Section-level paginated hooks
// ─────────────────────────────────────────────────────

interface PaginatedSectionState<T> {
  items: T[];
  cursor: string | null;
  hasMore: boolean;
  isLoadingMore: boolean;
}

/**
 * Paginated claims for a section route. Returns a managed list with loadMore + target resolution.
 */
export function usePaginatedClaims(
  roomId: string,
  opts?: {
    questionId?: string | null;
    debateSide?: "proposition" | "opposition" | null;
    pageSize?: number;
    enabled?: boolean;
  },
) {
  const [state, setState] = useState<PaginatedSectionState<DiscussionClaim>>({
    items: [],
    cursor: null,
    hasMore: true,
    isLoadingMore: false,
  });

  const query = useQuery({
    queryKey: ["claims", "paginated", roomId, { questionId: opts?.questionId, debateSide: opts?.debateSide, pageSize: opts?.pageSize }],
    queryFn: async () => {
      const page = await getClaimsPaginated(roomId, {
        pageSize: opts?.pageSize,
        questionId: opts?.questionId,
        debateSide: opts?.debateSide,
      });
      setState({ items: page.items, cursor: page.nextCursor, hasMore: page.nextCursor !== null, isLoadingMore: false });
      return page;
    },
    enabled: opts?.enabled !== false && !!roomId,
    staleTime: 30_000,
  });

  const loadMore = useCallback(async () => {
    if (!state.cursor || state.isLoadingMore) return;
    setState((s) => ({ ...s, isLoadingMore: true }));
    try {
      const page = await getClaimsPaginated(roomId, {
        pageSize: opts?.pageSize,
        questionId: opts?.questionId,
        debateSide: opts?.debateSide,
        cursor: state.cursor,
      });
      setState((s) => ({
        items: [...s.items, ...page.items],
        cursor: page.nextCursor,
        hasMore: page.nextCursor !== null,
        isLoadingMore: false,
      }));
    } catch {
      setState((s) => ({ ...s, isLoadingMore: false }));
    }
  }, [roomId, opts?.questionId, opts?.debateSide, opts?.pageSize, state.cursor, state.isLoadingMore]);

  return {
    items: state.items,
    isLoading: query.isLoading,
    error: query.error,
    hasMore: state.hasMore,
    isLoadingMore: state.isLoadingMore,
    loadMore,
    refetch: query.refetch,
  };
}

/**
 * Lightweight bounded claim options (id/content/debateSide) for the debate
 * inquiries "Target Claim" dropdown, independent of the arguments section query.
 */
export function useClaimsMinimal(roomId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ["claims", "minimal", roomId],
    queryFn: () => getClaimsMinimal(roomId),
    enabled: enabled && !!roomId,
    staleTime: 30_000,
  });
}

/**
 * Single-claim target lookup for off-page resolution.
 */
export function useClaimTarget(claimId: string | null | undefined, roomId: string) {
  return useQuery({
    queryKey: ["claimTarget", claimId],
    queryFn: () => getClaimById(claimId!, roomId),
    enabled: !!claimId && !!roomId,
    staleTime: 60_000,
  });
}

/**
 * Batch-fetch claims for a bounded set of IDs within a room (used to resolve
 * claim snippets referenced by a paginated evidence list).
 */
export function useClaimsByIds(claimIds: string[], roomId: string, enabled: boolean = true) {
  const ids = useMemo(() => [...new Set(claimIds)].sort(), [claimIds]);
  return useQuery({
    queryKey: ["claims", "byIds", roomId, ids],
    queryFn: () => getClaimsByIds(ids, roomId),
    enabled: enabled && !!roomId && ids.length > 0,
    staleTime: 30_000,
  });
}

/**
 * Paginated evidence for a section route.
 */
export function usePaginatedEvidence(
  roomId: string,
  opts?: {
    direction?: "support" | "contradict" | "context" | null;
    pageSize?: number;
    enabled?: boolean;
  },
) {
  const [state, setState] = useState<PaginatedSectionState<DiscussionEvidence>>({
    items: [],
    cursor: null,
    hasMore: true,
    isLoadingMore: false,
  });

  const query = useQuery({
    queryKey: ["roomEvidence", "paginated", roomId, { direction: opts?.direction, pageSize: opts?.pageSize }],
    queryFn: async () => {
      const page = await getEvidencePaginated(roomId, {
        pageSize: opts?.pageSize,
        direction: opts?.direction,
      });
      setState({ items: page.items, cursor: page.nextCursor, hasMore: page.nextCursor !== null, isLoadingMore: false });
      return page;
    },
    enabled: opts?.enabled !== false && !!roomId,
    staleTime: 30_000,
  });

  const loadMore = useCallback(async () => {
    if (!state.cursor || state.isLoadingMore) return;
    setState((s) => ({ ...s, isLoadingMore: true }));
    try {
      const page = await getEvidencePaginated(roomId, {
        pageSize: opts?.pageSize,
        direction: opts?.direction,
        cursor: state.cursor,
      });
      setState((s) => ({
        items: [...s.items, ...page.items],
        cursor: page.nextCursor,
        hasMore: page.nextCursor !== null,
        isLoadingMore: false,
      }));
    } catch {
      setState((s) => ({ ...s, isLoadingMore: false }));
    }
  }, [roomId, opts?.direction, opts?.pageSize, state.cursor, state.isLoadingMore]);

  return {
    items: state.items,
    isLoading: query.isLoading,
    error: query.error,
    hasMore: state.hasMore,
    isLoadingMore: state.isLoadingMore,
    loadMore,
    refetch: query.refetch,
  };
}

/**
 * Single-evidence target lookup for off-page resolution.
 */
export function useEvidenceTarget(evidenceId: string | null | undefined, roomId: string) {
  return useQuery({
    queryKey: ["evidenceTarget", evidenceId],
    queryFn: () => getEvidenceById(evidenceId!, roomId),
    enabled: !!evidenceId && !!roomId,
    staleTime: 60_000,
  });
}

/**
 * Paginated messages (contributions) for a section route.
 */
export function usePaginatedMessages(
  roomId: string,
  opts?: {
    pageSize?: number;
    enabled?: boolean;
  },
) {
  const [state, setState] = useState<PaginatedSectionState<DiscussionMessage>>({
    items: [],
    cursor: null,
    hasMore: true,
    isLoadingMore: false,
  });

  const query = useQuery({
    queryKey: ["messages", "paginated", roomId, { pageSize: opts?.pageSize }],
    queryFn: async () => {
      const page = await getMessagesPaginated(roomId, { pageSize: opts?.pageSize });
      setState({ items: page.items, cursor: page.nextCursor, hasMore: page.nextCursor !== null, isLoadingMore: false });
      return page;
    },
    enabled: opts?.enabled !== false && !!roomId,
    staleTime: 30_000,
  });

  const loadMore = useCallback(async () => {
    if (!state.cursor || state.isLoadingMore) return;
    setState((s) => ({ ...s, isLoadingMore: true }));
    try {
      const page = await getMessagesPaginated(roomId, {
        pageSize: opts?.pageSize,
        cursor: state.cursor,
      });
      setState((s) => ({
        items: [...s.items, ...page.items],
        cursor: page.nextCursor,
        hasMore: page.nextCursor !== null,
        isLoadingMore: false,
      }));
    } catch {
      setState((s) => ({ ...s, isLoadingMore: false }));
    }
  }, [roomId, opts?.pageSize, state.cursor, state.isLoadingMore]);

  return {
    items: state.items,
    isLoading: query.isLoading,
    error: query.error,
    hasMore: state.hasMore,
    isLoadingMore: state.isLoadingMore,
    loadMore,
    refetch: query.refetch,
  };
}

/**
 * Single-message target lookup for off-page resolution.
 */
export function useMessageTarget(messageId: string | null | undefined, roomId: string) {
  return useQuery({
    queryKey: ["messageTarget", messageId],
    queryFn: () => getMessageById(messageId!, roomId),
    enabled: !!messageId && !!roomId,
    staleTime: 60_000,
  });
}

/**
 * Root-first thread pagination for the contributions section. Loads a bounded
 * set of ROOT messages (parent_message_id IS NULL) ascending, then walks each
 * loaded root's descendant subtree level-by-level (room-scoped) so the
 * accumulated list is a set of COMPLETE threads feeding buildCommentTree —
 * never the whole room collection.
 */
export function usePaginatedThreads(
  roomId: string,
  opts?: {
    pageSize?: number;
    enabled?: boolean;
  },
) {
  const [state, setState] = useState<{
    items: DiscussionMessage[];
    rootIds: string[];
    cursor: string | null;
    hasMore: boolean;
    isLoadingMore: boolean;
  }>({
    items: [],
    rootIds: [],
    cursor: null,
    hasMore: true,
    isLoadingMore: false,
  });

  const loadThreadPage = useCallback(
    async (cursor?: string) => {
      const page = await getMessageRoots(roomId, { pageSize: opts?.pageSize, cursor });
      const roots = page.items;
      const descendants = await getMessageSubtreeDescendants(roomId, roots.map((r) => r.id));
      return { roots, descendants, nextCursor: page.nextCursor, hasMore: page.nextCursor !== null };
    },
    [roomId, opts?.pageSize],
  );

  const query = useQuery({
    // Keyed under ["messages", roomId] so the existing room-scoped mutation
    // invalidation (invalidateRoomQueries "messages") prefix-matches it.
    queryKey: ["messages", roomId, "thread", { pageSize: opts?.pageSize }],
    queryFn: async () => {
      const res = await loadThreadPage(undefined);
      setState({
        items: [...res.roots, ...res.descendants],
        rootIds: res.roots.map((r) => r.id),
        cursor: res.nextCursor,
        hasMore: res.hasMore,
        isLoadingMore: false,
      });
      return res;
    },
    enabled: opts?.enabled !== false && !!roomId,
    staleTime: 30_000,
  });

  const loadMore = useCallback(async () => {
    if (!state.cursor || state.isLoadingMore) return;
    setState((s) => ({ ...s, isLoadingMore: true }));
    try {
      const res = await loadThreadPage(state.cursor);
      setState((s) => {
        const existing = new Set(s.rootIds);
        const newRoots = res.roots.filter((r) => !existing.has(r.id));
        return {
          items: [...s.items, ...newRoots, ...res.descendants],
          rootIds: [...s.rootIds, ...newRoots.map((r) => r.id)],
          cursor: res.nextCursor,
          hasMore: res.hasMore,
          isLoadingMore: false,
        };
      });
    } catch {
      setState((s) => ({ ...s, isLoadingMore: false }));
    }
  }, [state.cursor, state.isLoadingMore, loadThreadPage]);

  return {
    items: state.items,
    isLoading: query.isLoading,
    error: query.error,
    hasMore: state.hasMore,
    isLoadingMore: state.isLoadingMore,
    loadMore,
    refetch: query.refetch,
  };
}

/**
 * Resolve an off-page contribution target: fetches the target (room-scoped),
 * walks its ancestor chain, and loads the complete root thread so it can be
 * rendered/highlighted without fetching the whole room.
 */
export function useThreadTarget(messageId: string | null | undefined, roomId: string) {
  return useQuery({
    queryKey: ["messageThreadTarget", messageId, roomId],
    queryFn: () => resolveMessageThread(roomId, messageId!),
    enabled: !!messageId && !!roomId,
    staleTime: 60_000,
  });
}

/**
 * Paginated questions for a section route.
 */
export function usePaginatedQuestions(
  roomId: string,
  opts?: {
    pageSize?: number;
    enabled?: boolean;
  },
) {
  const [state, setState] = useState<PaginatedSectionState<DiscussionQuestion>>({
    items: [],
    cursor: null,
    hasMore: true,
    isLoadingMore: false,
  });

  const query = useQuery({
    queryKey: ["questions", "paginated", roomId, { pageSize: opts?.pageSize }],
    queryFn: async () => {
      const page = await getQuestionsPaginated(roomId, { pageSize: opts?.pageSize });
      setState({ items: page.items, cursor: page.nextCursor, hasMore: page.nextCursor !== null, isLoadingMore: false });
      return page;
    },
    enabled: opts?.enabled !== false && !!roomId,
    staleTime: 30_000,
  });

  const loadMore = useCallback(async () => {
    if (!state.cursor || state.isLoadingMore) return;
    setState((s) => ({ ...s, isLoadingMore: true }));
    try {
      const page = await getQuestionsPaginated(roomId, {
        pageSize: opts?.pageSize,
        cursor: state.cursor,
      });
      setState((s) => ({
        items: [...s.items, ...page.items],
        cursor: page.nextCursor,
        hasMore: page.nextCursor !== null,
        isLoadingMore: false,
      }));
    } catch {
      setState((s) => ({ ...s, isLoadingMore: false }));
    }
  }, [roomId, opts?.pageSize, state.cursor, state.isLoadingMore]);

  return {
    items: state.items,
    isLoading: query.isLoading,
    error: query.error,
    hasMore: state.hasMore,
    isLoadingMore: state.isLoadingMore,
    loadMore,
    refetch: query.refetch,
  };
}

/**
 * Single-question target lookup for off-page resolution.
 */
export function useQuestionTarget(questionId: string | null | undefined, roomId: string) {
  return useQuery({
    queryKey: ["questionTarget", questionId],
    queryFn: () => getQuestionById(questionId!, roomId),
    enabled: !!questionId && !!roomId,
    staleTime: 60_000,
  });
}
