import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { getTopics, createDiscussion, getDiscussions, getMessages, postMessage, updateMessage, getClaims, createClaim, retractClaim, retractEvidence, getEvidenceForClaim, createEvidence, getEvidenceForRoom, castClaimVote, castEvidenceVote, encodeDiscussionFeedCursor, getQuestions, createQuestion, retractQuestion, flagEntity, getPendingFlags, getModerationHistory, resolveFlag, getClaimRelations, createClaimRelation, deleteClaimRelation } from "@/features/discussions/services/discussion-service";
import type { QuestionType, ClaimContextType } from "@/types/domain";
import type { ClaimRelationType } from "@/features/discussions/types";


/**
 * Hook to retrieve all seeded topics
 */
export function useTopics() {
  return useQuery({
    queryKey: ["topics"],
    queryFn: () => getTopics(),
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
  });
}

/**
 * Hook to retrieve messages for a discussion room
 */
export function useMessages(roomId: string) {
  return useQuery({
    queryKey: ["messages", roomId],
    queryFn: () => getMessages(roomId),
    enabled: !!roomId,
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
      // Invalidate messages for this specific room
      queryClient.invalidateQueries({ queryKey: ["messages", variables.roomId] });
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
      queryClient.invalidateQueries({ queryKey: ["messages", roomId] });
    },
  });
}

/**
 * Hook to retrieve questions for a room
 */
export function useQuestions(roomId: string) {
  return useQuery({
    queryKey: ["questions", roomId],
    queryFn: () => getQuestions(roomId),
    enabled: !!roomId,
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
      queryClient.invalidateQueries({ queryKey: ["questions", roomId] });
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
      queryClient.invalidateQueries({ queryKey: ["questions", roomId] });
    },
  });
}

/**
 * Hook to retrieve claims for a discussion room
 */
export function useClaims(roomId: string, questionId?: string | null) {
  return useQuery({
    queryKey: ["claims", roomId, { questionId }],
    queryFn: () => getClaims(roomId, questionId),
    enabled: !!roomId,
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
    }) => createClaim(data),
    onSuccess: () => {
      // Invalidate claims list
      queryClient.invalidateQueries({ queryKey: ["claims", roomId] });
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
      queryClient.invalidateQueries({ queryKey: ["claims", roomId] });
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
      queryClient.invalidateQueries({ queryKey: ["claims", roomId] });
      queryClient.invalidateQueries({ queryKey: ["evidence", claimId] });
      queryClient.invalidateQueries({ queryKey: ["roomEvidence", roomId] });
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
      queryClient.invalidateQueries({ queryKey: ["roomEvidence", roomId] });
      queryClient.invalidateQueries({ queryKey: ["evidence", claimId] });
      queryClient.invalidateQueries({ queryKey: ["claims", roomId] });
    },
  });
}

/**
 * Hook to retrieve all evidence for a discussion room
 */
export function useRoomEvidence(roomId: string) {
  return useQuery({
    queryKey: ["roomEvidence", roomId],
    queryFn: () => getEvidenceForRoom(roomId),
    enabled: !!roomId,
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
      queryClient.invalidateQueries({ queryKey: ["claims", roomId] });
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
      queryClient.invalidateQueries({ queryKey: ["roomEvidence", roomId] });
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
      reason: string;
      roomId?: string;
    }) => flagEntity(data),
    onSuccess: (_, variables) => {
      if (variables.roomId) {
        queryClient.invalidateQueries({ queryKey: ["messages", variables.roomId] });
        queryClient.invalidateQueries({ queryKey: ["questions", variables.roomId] });
        queryClient.invalidateQueries({ queryKey: ["claims", variables.roomId] });
        queryClient.invalidateQueries({ queryKey: ["roomEvidence", variables.roomId] });
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
 * Hook to retrieve all claim relations for a room
 */
export function useClaimRelations(roomId: string) {
  return useQuery({
    queryKey: ["claimRelations", roomId],
    queryFn: () => getClaimRelations(roomId),
    enabled: !!roomId,
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
      queryClient.invalidateQueries({ queryKey: ["claimRelations", roomId] });
      queryClient.invalidateQueries({ queryKey: ["claims", roomId] });
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
      queryClient.invalidateQueries({ queryKey: ["claimRelations", roomId] });
      queryClient.invalidateQueries({ queryKey: ["claims", roomId] });
    },
  });
}
