import type { SupabaseClient } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/services/supabase/client";
import { mapSupabaseError } from "@/lib/errors";
import type { Topic, Room, Discussion, Message, DiscussionMessage, Claim, DiscussionClaim, DiscussionEvidence, Question, DiscussionQuestion, QuestionType, ModerationFlag, SearchResult, SearchResultType, DiscussionClaimRelation, ClaimRelationType, ClaimContextType, Debate } from "../types";

export interface DbTopicRow {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  created_by: string | null;
  is_platform_topic: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbRoomRow {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  room_type: "discussion" | "debate" | "private";
  visibility: "public" | "private";
  status: "open" | "inactive" | "archived";
  created_by: string | null;
  topic_id: string | null;
  created_at: string;
  updated_at: string;
  access_code: string | null;
  participant_invites_enabled: boolean;
}

export interface DbDiscussionRow {
  id: string;
  opening_statement: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbMessageRow {
  id: string;
  room_id: string;
  user_id: string | null;
  parent_message_id: string | null;
  content: string;
  identity_mode: "public" | "anonymous";
  message_type: "message" | "question" | "system";
  created_at: string;
  updated_at: string;
}

export interface DbDiscussionMessageRow {
  id: string;
  room_id: string;
  parent_message_id: string | null;
  content: string;
  identity_mode: "public" | "anonymous";
  message_type: "message" | "question" | "system";
  created_at: string;
  updated_at: string;
  user_id: string | null;
  username: string | null;
  avatar_url: string | null;
  is_moderated: boolean;
}

export interface DbDebateRow {
  id: string;
  proposition_title: string;
  opposition_title: string;
  opening_statement: string | null;
  status: string;
  resolution: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  proposition_claim_count: number;
  opposition_claim_count: number;
  proposition_participant_count: number;
  opposition_participant_count: number;
  neutral_participant_count: number;
  total_claims?: number;
  total_participants?: number;
  total_evidence?: number;
  last_activity_at?: string;
  title?: string;
  slug?: string;
  description?: string | null;
  room_created_by?: string;
  topic_id?: string | null;
  visibility?: string;
  room_created_at?: string;
  room_updated_at?: string;
}

export interface DbJoinedRoomRow extends DbRoomRow {
  topics: DbTopicRow | null;
  discussions: DbDiscussionRow | null;
  debates: DbDebateRow | null;
}

export interface DiscussionFeedItem {
  room: Room;
  topic: Topic | null;
  discussion: Discussion | null;
  debate?: Debate | null;
}

// Helper to resolve Supabase Client
function getClient(overrideClient?: SupabaseClient): SupabaseClient {
  return overrideClient || createBrowserSupabaseClient();
}

/** Opaque cursor for discussion feed keyset pagination: `{createdAt}|{roomId}` */
const DISCUSSION_FEED_CURSOR_SEP = "|";

export function encodeDiscussionFeedCursor(createdAt: string, roomId: string): string {
  return `${createdAt}${DISCUSSION_FEED_CURSOR_SEP}${roomId}`;
}

export function parseDiscussionFeedCursor(
  cursor: string,
): { createdAt: string; roomId: string } | null {
  const sepIndex = cursor.indexOf(DISCUSSION_FEED_CURSOR_SEP);
  if (sepIndex <= 0 || sepIndex === cursor.length - 1) {
    return null;
  }
  return {
    createdAt: cursor.slice(0, sepIndex),
    roomId: cursor.slice(sepIndex + 1),
  };
}

/** Mutation responses return ids only — never raw identity columns from base tables. */
export type MutationIdResult = { id: string };

// Mapper Functions to map snake_case db columns to camelCase types
export function mapTopicRow(row: DbTopicRow): Topic {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    slug: row.slug,
    createdBy: row.created_by || "",
    isPlatformTopic: row.is_platform_topic,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapRoomRow(row: DbRoomRow): Room {
  return {
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    slug: row.slug,
    roomType: row.room_type,
    visibility: row.visibility,
    status: row.status,
    createdBy: row.created_by || "",
    topicId: row.topic_id || undefined,
    accessCode: row.access_code || null,
    participantInvitesEnabled: row.participant_invites_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapDebateRow(row: DbDebateRow): Debate {
  return {
    id: row.id,
    propositionTitle: row.proposition_title,
    oppositionTitle: row.opposition_title,
    openingStatement: row.opening_statement,
    status: row.status as "active" | "resolved" | "closed",
    resolution: row.resolution,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    propositionClaimCount: row.proposition_claim_count,
    oppositionClaimCount: row.opposition_claim_count,
    propositionParticipantCount: row.proposition_participant_count,
    oppositionParticipantCount: row.opposition_participant_count,
    neutralParticipantCount: row.neutral_participant_count,
    totalClaims: row.total_claims ?? (row.proposition_claim_count + row.opposition_claim_count),
    totalParticipants: row.total_participants ?? (row.proposition_participant_count + row.opposition_participant_count + row.neutral_participant_count),
    totalEvidence: row.total_evidence ?? 0,
    lastActivityAt: row.last_activity_at ?? row.updated_at,
  };
}

export function mapDiscussionRow(row: DbDiscussionRow): Discussion {
  return {
    id: row.id,
    openingStatement: row.opening_statement,
    summary: row.summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapMessageRow(row: DbMessageRow): Message {
  return {
    id: row.id,
    roomId: row.room_id,
    userId: row.user_id,
    parentMessageId: row.parent_message_id,
    content: row.content,
    identityMode: row.identity_mode,
    messageType: row.message_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapDiscussionMessageRow(row: DbDiscussionMessageRow): DiscussionMessage {
  return {
    id: row.id,
    roomId: row.room_id,
    parentMessageId: row.parent_message_id,
    content: row.content,
    identityMode: row.identity_mode,
    messageType: row.message_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userId: row.user_id,
    username: row.username,
    avatarUrl: row.avatar_url,
    isModerated: row.is_moderated,
  };
}

/**
 * Fetch all standard platform topics
 */
export async function getTopics(overrideClient?: SupabaseClient): Promise<Topic[]> {
  const supabase = getClient(overrideClient);
  const { data, error } = await supabase
    .from("topics")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to load topics"));
  }

  return (data || []).map(mapTopicRow);
}

/**
 * Fetch discussions feed with cursor-based pagination and optional topic filtering
 */
export async function getDiscussions(
  limit: number = 10,
  cursor?: string,
  topicId?: string,
  overrideClient?: SupabaseClient,
): Promise<DiscussionFeedItem[]> {
  const supabase = getClient(overrideClient);

  let query = supabase
    .from("rooms")
    .select(`
        *,
        topics!left (*),
        discussions!left (*),
        debates!left (*)
      `)
    .eq("room_type", "discussion")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (topicId) {
    query = query.eq("topic_id", topicId);
  }

  if (cursor) {
    const parsed = parseDiscussionFeedCursor(cursor);
    if (parsed) {
      const { createdAt, roomId } = parsed;
      query = query.or(
        `created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${roomId})`,
      );
    }
  }

  query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to load discussions"));
  }

  const rows = (data || []) as unknown as DbJoinedRoomRow[];

  return rows.map((row) => ({
    room: mapRoomRow(row),
    topic: row.topics ? mapTopicRow(row.topics) : null,
    discussion: row.discussions ? mapDiscussionRow(row.discussions) : null,
    debate: row.debates ? mapDebateRow(row.debates) : null,
  }));
}

/**
 * Query room and discussion details by room slug
 */
export async function getDiscussionBySlug(
  slug: string,
  overrideClient?: SupabaseClient,
): Promise<DiscussionFeedItem | null> {
  const supabase = getClient(overrideClient);

  const { data, error } = await supabase
    .from("rooms")
    .select(`
        *,
        topics!left (*),
        discussions!left (*),
        debates!left (*)
      `)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to load discussion"));
  }

  if (!data) return null;

  const joinedRow = data as unknown as DbJoinedRoomRow;

  return {
    room: mapRoomRow(joinedRow),
    topic: joinedRow.topics ? mapTopicRow(joinedRow.topics) : null,
    discussion: joinedRow.discussions ? mapDiscussionRow(joinedRow.discussions) : null,
    debate: joinedRow.debates ? mapDebateRow(joinedRow.debates) : null,
  };
}

/**
 * Create a new room and discussion metadata atomically via database RPC function
 */
export async function createDiscussion(
  data: {
    title: string;
    description?: string;
    topicId: string;
    openingStatement: string;
    summary?: string;
  },
  overrideClient?: SupabaseClient,
): Promise<DiscussionFeedItem> {
  const supabase = getClient(overrideClient);

  // 1. Execute atomic RPC function transaction
  const { data: roomId, error: rpcError } = await supabase.rpc(
    "create_discussion_room",
    {
      p_title: data.title,
      p_description: data.description || null,
      p_topic_id: data.topicId,
      p_opening_statement: data.openingStatement,
      p_summary: data.summary || null,
    },
  );

  if (rpcError || !roomId) {
    throw new Error(mapSupabaseError(rpcError, "Failed to create discussion room"));
  }

  // 2. Query back the complete discussion feed item
  const { data: roomResult, error: readError } = await supabase
    .from("rooms")
    .select(`
        *,
        topics!left (*),
        discussions!left (*)
      `)
    .eq("id", roomId)
    .single();

  if (readError || !roomResult) {
    throw new Error(mapSupabaseError(readError, "Failed to retrieve the created discussion details"));
  }

  const joinedRow = roomResult as unknown as DbJoinedRoomRow;

  return {
    room: mapRoomRow(joinedRow),
    topic: joinedRow.topics ? mapTopicRow(joinedRow.topics) : null,
    discussion: joinedRow.discussions ? mapDiscussionRow(joinedRow.discussions) : null,
    debate: null,
  };
}

/**
 * Fetch messages for a discussion room using the dynamic redacted view
 */
export async function getMessages(
  roomId: string,
  overrideClient?: SupabaseClient,
): Promise<DiscussionMessage[]> {
  const supabase = getClient(overrideClient);

  const { data, error } = await supabase
    .from("discussion_messages")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to load messages"));
  }

  const rows = (data || []) as DbDiscussionMessageRow[];

  return rows.map(mapDiscussionMessageRow);
}

/**
 * Post a new message or nested reply
 */
export async function postMessage(
  data: {
    roomId: string;
    parentMessageId?: string | null;
    content: string;
    identityMode: "public" | "anonymous";
  },
  overrideClient?: SupabaseClient,
): Promise<MutationIdResult> {
  const supabase = getClient(overrideClient);

  const { data: inserted, error } = await supabase
    .from("messages")
    .insert({
      room_id: data.roomId,
      parent_message_id: data.parentMessageId || null,
      content: data.content,
      identity_mode: data.identityMode,
      message_type: "message",
    })
    .select("id")
    .single();

  if (error || !inserted) {
    throw new Error(mapSupabaseError(error, "Failed to post message"));
  }

  return { id: inserted.id };
}

/**
 * Update an existing message (will throw exception via trigger if > 5 minutes or columns modified)
 */
export async function updateMessage(
  id: string,
  content: string,
  overrideClient?: SupabaseClient,
): Promise<MutationIdResult> {
  const supabase = getClient(overrideClient);

  const { data: updated, error } = await supabase
    .from("messages")
    .update({ content })
    .eq("id", id)
    .select("id")
    .single();

  if (error || !updated) {
    throw new Error(mapSupabaseError(error, "Failed to update message"));
  }

  return { id: updated.id };
}

export interface DbQuestionRow {
  id: string;
  room_id: string;
  created_by: string | null;
  content: string;
  question_type: QuestionType;
  identity_mode: "public" | "anonymous";
  is_retracted: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbDiscussionQuestionRow {
  id: string;
  room_id: string;
  content: string;
  question_type: QuestionType;
  identity_mode: "public" | "anonymous";
  is_retracted: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  username: string | null;
  avatar_url: string | null;
}

export interface DbClaimRow {
  id: string;
  room_id: string;
  created_by: string | null;
  origin_message_id: string | null;
  question_id: string | null;
  content: string;
  claim_type: "fact" | "opinion" | "prediction" | "proposal" | "observation";
  context_type: ClaimContextType;
  identity_mode: "public" | "anonymous";
  is_retracted: boolean;
  debate_side?: "proposition" | "opposition" | null;
  created_at: string;
  updated_at: string;
  agree_count?: number;
  disagree_count?: number;
  consensus_ratio?: number | null;
  user_vote?: "agree" | "disagree" | null;
}

export interface DbDiscussionClaimRow {
  id: string;
  room_id: string;
  origin_message_id: string | null;
  question_id: string | null;
  content: string;
  claim_type: "fact" | "opinion" | "prediction" | "proposal" | "observation";
  context_type: ClaimContextType;
  identity_mode: "public" | "anonymous";
  is_retracted: boolean;
  debate_side?: "proposition" | "opposition" | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  username: string | null;
  avatar_url: string | null;
  agree_count?: number;
  disagree_count?: number;
  consensus_ratio?: number | null;
  user_vote?: "agree" | "disagree" | null;
}

export function mapQuestionRow(row: DbQuestionRow): Question {
  return {
    id: row.id,
    roomId: row.room_id,
    createdBy: row.created_by,
    content: row.content,
    questionType: row.question_type,
    identityMode: row.identity_mode,
    isRetracted: row.is_retracted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapDiscussionQuestionRow(row: DbDiscussionQuestionRow): DiscussionQuestion {
  return {
    id: row.id,
    roomId: row.room_id,
    content: row.content,
    questionType: row.question_type,
    identityMode: row.identity_mode,
    isRetracted: row.is_retracted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    username: row.username,
    avatarUrl: row.avatar_url,
  };
}

export function mapClaimRow(row: DbClaimRow): Claim {
  return {
    id: row.id,
    roomId: row.room_id,
    createdBy: row.created_by,
    originMessageId: row.origin_message_id,
    questionId: row.question_id,
    content: row.content,
    claimType: row.claim_type,
    contextType: row.context_type,
    identityMode: row.identity_mode,
    isRetracted: row.is_retracted,
    debateSide: row.debate_side || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    agreeCount: row.agree_count,
    disagreeCount: row.disagree_count,
    consensusRatio: row.consensus_ratio,
    userVote: row.user_vote,
  };
}

export function mapDiscussionClaimRow(row: DbDiscussionClaimRow): DiscussionClaim {
  return {
    id: row.id,
    roomId: row.room_id,
    originMessageId: row.origin_message_id,
    questionId: row.question_id,
    content: row.content,
    claimType: row.claim_type,
    contextType: row.context_type,
    identityMode: row.identity_mode,
    isRetracted: row.is_retracted,
    debateSide: row.debate_side || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    username: row.username,
    avatarUrl: row.avatar_url,
    agreeCount: row.agree_count,
    disagreeCount: row.disagree_count,
    consensusRatio: row.consensus_ratio,
    userVote: row.user_vote,
  };
}

/**
 * Fetch questions for a room using the dynamic redacted view
 */
export async function getQuestions(
  roomId: string,
  overrideClient?: SupabaseClient,
): Promise<DiscussionQuestion[]> {
  const supabase = getClient(overrideClient);
  const { data, error } = await supabase
    .from("discussion_questions")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to load questions"));
  }

  const rows = (data || []) as DbDiscussionQuestionRow[];
  return rows.map(mapDiscussionQuestionRow);
}

/**
 * Ask/create a new question
 */
export async function createQuestion(
  data: {
    roomId: string;
    content: string;
    questionType: QuestionType;
    identityMode: "public" | "anonymous";
  },
  overrideClient?: SupabaseClient,
): Promise<MutationIdResult> {
  const supabase = getClient(overrideClient);
  const { data: inserted, error } = await supabase
    .from("questions")
    .insert({
      room_id: data.roomId,
      content: data.content,
      question_type: data.questionType,
      identity_mode: data.identityMode,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    throw new Error(mapSupabaseError(error, "Failed to create question"));
  }

  return { id: inserted.id };
}

/**
 * Retract an existing question (makes it inactive, does not delete)
 */
export async function retractQuestion(
  id: string,
  overrideClient?: SupabaseClient,
): Promise<MutationIdResult> {
  const supabase = getClient(overrideClient);
  const { data: updated, error } = await supabase
    .from("questions")
    .update({ is_retracted: true })
    .eq("id", id)
    .select("id")
    .single();

  if (error || !updated) {
    throw new Error(mapSupabaseError(error, "Failed to retract question"));
  }

  return { id: updated.id };
}

/**
 * Fetch claims for a discussion room using the dynamic redacted view (optionally filtered by questionId)
 */
export async function getClaims(
  roomId: string,
  questionId?: string | null,
  overrideClient?: SupabaseClient,
): Promise<DiscussionClaim[]> {
  const supabase = getClient(overrideClient);
  let query = supabase
    .from("discussion_claims")
    .select("*")
    .eq("room_id", roomId);

  if (questionId) {
    query = query.eq("question_id", questionId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to load claims"));
  }

  const rows = (data || []) as DbDiscussionClaimRow[];
  return rows.map(mapDiscussionClaimRow);
}

/**
 * Create a new claim or extract a claim from an existing message (optionally linked to a questionId)
 */
export async function createClaim(
  data: {
    roomId: string;
    content: string;
    claimType: "fact" | "opinion" | "prediction" | "proposal" | "observation";
    contextType: ClaimContextType;
    identityMode: "public" | "anonymous";
    originMessageId?: string | null;
    questionId?: string | null;
    debateSide?: "proposition" | "opposition" | null;
  },
  overrideClient?: SupabaseClient,
): Promise<MutationIdResult> {
  const supabase = getClient(overrideClient);
  const { data: inserted, error } = await supabase
    .from("claims")
    .insert({
      room_id: data.roomId,
      content: data.content,
      claim_type: data.claimType,
      context_type: data.contextType,
      identity_mode: data.identityMode,
      origin_message_id: data.originMessageId || null,
      question_id: data.questionId || null,
      debate_side: data.debateSide || null,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    throw new Error(mapSupabaseError(error, "Failed to create claim"));
  }

  return { id: inserted.id };
}

/**
 * Retract an existing evidence entry (flags is_retracted, does not delete)
 */
export async function retractEvidence(
  id: string,
  overrideClient?: SupabaseClient,
): Promise<MutationIdResult> {
  const supabase = getClient(overrideClient);
  const { data: updated, error } = await supabase
    .from("evidence")
    .update({ is_retracted: true })
    .eq("id", id)
    .select("id")
    .single();

  if (error || !updated) {
    throw new Error(mapSupabaseError(error, "Failed to retract evidence"));
  }

  return { id: updated.id };
}

/**
 * Retract an existing claim (makes it inactive, does not delete)
 */
export async function retractClaim(
  id: string,
  overrideClient?: SupabaseClient,
): Promise<MutationIdResult> {
  const supabase = getClient(overrideClient);
  const { data: updated, error } = await supabase
    .from("claims")
    .update({ is_retracted: true })
    .eq("id", id)
    .select("id")
    .single();

  if (error || !updated) {
    throw new Error(mapSupabaseError(error, "Failed to retract claim"));
  }

  return { id: updated.id };
}

export interface DbDiscussionEvidenceRow {
  id: string;
  room_id: string;
  source_id: string;
  content: string;
  evidence_type: "scientific" | "statistical" | "documentary" | "visual" | "experiential" | "expert" | "historical" | "logical" | "ethical" | "cultural";
  identity_mode: "public" | "anonymous";
  is_retracted: boolean;
  created_at: string;
  updated_at: string;
  claim_id: string;
  direction: "support" | "contradict" | "context";
  created_by: string | null;
  username: string | null;
  avatar_url: string | null;
  source_title: string;
  source_url: string | null;
  source_file_path: string | null;
  source_is_retracted: boolean;
  agree_count?: number;
  disagree_count?: number;
  consensus_ratio?: number | null;
  user_vote?: "agree" | "disagree" | null;
}

export function mapDiscussionEvidenceRow(row: DbDiscussionEvidenceRow): DiscussionEvidence {
  return {
    id: row.id,
    roomId: row.room_id,
    sourceId: row.source_id,
    content: row.content,
    evidenceType: row.evidence_type,
    identityMode: row.identity_mode,
    isRetracted: row.is_retracted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    claimId: row.claim_id,
    direction: row.direction,
    createdBy: row.created_by,
    username: row.username,
    avatarUrl: row.avatar_url,
    sourceTitle: row.source_title,
    sourceUrl: row.source_url,
    sourceFilePath: row.source_file_path,
    sourceIsRetracted: row.source_is_retracted,
    agreeCount: row.agree_count,
    disagreeCount: row.disagree_count,
    consensusRatio: row.consensus_ratio,
    userVote: row.user_vote,
  };
}

export function mapDiscussionClaimRelationRow(row: DbDiscussionClaimRelationRow): DiscussionClaimRelation {
  return {
    id: row.id,
    roomId: row.room_id,
    sourceClaimId: row.source_claim_id,
    targetClaimId: row.target_claim_id,
    relationType: row.relation_type,
    createdBy: row.created_by,
    createdAt: row.created_at,
    sourceClaimContent: row.source_claim_content,
    sourceClaimType: row.source_claim_type,
    targetClaimContent: row.target_claim_content,
    targetClaimType: row.target_claim_type,
  };
}

/**
 * Fetch evidence for a claim using the dynamic redacted view
 */
export async function getEvidenceForClaim(
  claimId: string,
  overrideClient?: SupabaseClient,
): Promise<DiscussionEvidence[]> {
  const supabase = getClient(overrideClient);
  const { data, error } = await supabase
    .from("discussion_evidence")
    .select("*")
    .eq("claim_id", claimId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to load evidence"));
  }

  const rows = (data || []) as DbDiscussionEvidenceRow[];
  return rows.map(mapDiscussionEvidenceRow);
}

/**
 * Create a new source reference and evidence record, then link them to a claim
 */
export async function createEvidence(
  roomId: string,
  claimId: string,
  data: {
    content: string;
    evidenceType: "scientific" | "statistical" | "documentary" | "visual" | "experiential" | "expert" | "historical" | "logical" | "ethical" | "cultural";
    identityMode: "public" | "anonymous";
    direction: "support" | "contradict" | "context";
    sourceTitle: string;
    sourceUrl: string;
  },
  overrideClient?: SupabaseClient,
): Promise<void> {
  const supabase = getClient(overrideClient);

  // 1. Room-scoped source lookup or insert (no client SELECT on sources — ADR-016)
  const { data: sourceId, error: sourceError } = await supabase.rpc(
    "get_or_create_source",
    {
      p_room_id: roomId,
      p_title: data.sourceTitle,
      p_url: data.sourceUrl,
    },
  );

  if (sourceError || !sourceId) {
    throw new Error(mapSupabaseError(sourceError, "Failed to resolve source citation."));
  }

  // 2. Create evidence record
  const { data: newEvidence, error: evidenceError } = await supabase
    .from("evidence")
    .insert({
      room_id: roomId,
      source_id: sourceId,
      content: data.content,
      evidence_type: data.evidenceType,
      identity_mode: data.identityMode,
    })
    .select("id")
    .single();
  if (evidenceError || !newEvidence) {
    throw new Error(mapSupabaseError(evidenceError, "Failed to create evidence card."));
  }

  // 3. Create claim_evidence junction record (RLS + definer trigger enforce room + evidence ownership)
  const { error: junctionError } = await supabase
    .from("claim_evidence")
    .insert({
      claim_id: claimId,
      evidence_id: newEvidence.id,
      direction: data.direction,
    });

  if (junctionError) {
    throw new Error(mapSupabaseError(junctionError, "Failed to link evidence to claim."));
  }
}

/**
 * Fetch all evidence for a discussion room via the dynamic view
 */
export async function getEvidenceForRoom(
  roomId: string,
  overrideClient?: SupabaseClient,
): Promise<DiscussionEvidence[]> {
  const supabase = getClient(overrideClient);

  const { data, error } = await supabase
    .from("discussion_evidence")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to load evidence"));
  }

  const rows = (data || []) as DbDiscussionEvidenceRow[];
  return rows.map(mapDiscussionEvidenceRow);
}

/**
 * Fetch all claim relations for a room, including source and target claim content
 */
export async function getClaimRelations(
  roomId: string,
  overrideClient?: SupabaseClient,
): Promise<DiscussionClaimRelation[]> {
  const supabase = getClient(overrideClient);

  const { data, error } = await supabase
    .from("discussion_claim_relations")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to load claim relations"));
  }

  const rows = (data || []) as DbDiscussionClaimRelationRow[];
  return rows.map(mapDiscussionClaimRelationRow);
}

/**
 * Create a new relation between two claims in the same room
 */
export async function createClaimRelation(
  roomId: string,
  sourceClaimId: string,
  targetClaimId: string,
  relationType: ClaimRelationType,
  overrideClient?: SupabaseClient,
): Promise<{ id: string }> {
  const supabase = getClient(overrideClient);
  const { data, error } = await supabase
    .from("claim_relations")
    .insert({
      room_id: roomId,
      source_claim_id: sourceClaimId,
      target_claim_id: targetClaimId,
      relation_type: relationType,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(mapSupabaseError(error, "Failed to create claim relation"));
  }

  return { id: data.id };
}

/**
 * Delete a claim relation (only the creator may delete)
 */
export async function deleteClaimRelation(
  id: string,
  overrideClient?: SupabaseClient,
): Promise<void> {
  const supabase = getClient(overrideClient);
  const { error } = await supabase
    .from("claim_relations")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to delete claim relation"));
  }
}

/**
 * Cast or toggle a vote on a claim
 */
export async function castClaimVote(
  claimId: string,
  voteType: "agree" | "disagree" | null,
  overrideClient?: SupabaseClient,
): Promise<void> {
  const supabase = getClient(overrideClient);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Must be authenticated to vote.");
  }

  const { data: claimCheck } = await supabase
    .from("discussion_claims")
    .select("is_retracted")
    .eq("id", claimId)
    .maybeSingle();

  if (!claimCheck) {
    throw new Error("This claim is no longer accessible. The discussion room may have been archived.");
  }
  if (claimCheck.is_retracted) {
    throw new Error("This claim has been retracted. Voting is no longer available.");
  }

  if (voteType === null) {
    const { error } = await supabase
      .from("claim_votes")
      .delete()
      .eq("claim_id", claimId)
      .eq("user_id", user.id);
    if (error) {
      throw new Error(mapSupabaseError(error, "Failed to cast vote"));
    }
  } else {
    const { error } = await supabase
      .from("claim_votes")
      .upsert({
        claim_id: claimId,
        user_id: user.id,
        vote_type: voteType,
      }, {
        onConflict: "user_id,claim_id"
      });
    if (error) {
      throw new Error(mapSupabaseError(error, "Failed to cast vote"));
    }
  }
}

/**
 * Cast or toggle a vote on evidence
 */
export async function castEvidenceVote(
  evidenceId: string,
  voteType: "agree" | "disagree" | null,
  overrideClient?: SupabaseClient,
): Promise<void> {
  const supabase = getClient(overrideClient);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Must be authenticated to vote.");
  }

  const { data: evidenceCheck } = await supabase
    .from("discussion_evidence")
    .select("is_retracted")
    .eq("id", evidenceId)
    .maybeSingle();

  if (!evidenceCheck) {
    throw new Error("This evidence is no longer accessible. The discussion room may have been archived.");
  }
  if (evidenceCheck.is_retracted) {
    throw new Error("This evidence has been retracted. Voting is no longer available.");
  }

  if (voteType === null) {
    const { error } = await supabase
      .from("evidence_votes")
      .delete()
      .eq("evidence_id", evidenceId)
      .eq("user_id", user.id);
    if (error) {
      throw new Error(mapSupabaseError(error, "Failed to cast vote"));
    }
  } else {
    const { error } = await supabase
      .from("evidence_votes")
      .upsert({
        evidence_id: evidenceId,
        user_id: user.id,
        vote_type: voteType,
      }, {
        onConflict: "user_id,evidence_id"
      });
    if (error) {
      throw new Error(mapSupabaseError(error, "Failed to cast vote"));
    }
  }
}

export interface DbModerationFlagRow {
  id: string;
  message_id: string | null;
  question_id: string | null;
  claim_id: string | null;
  evidence_id: string | null;
  entity_type: "message" | "question" | "claim" | "evidence" | "unknown";
  reason: string;
  status: "pending" | "resolved_hidden" | "resolved_dismissed" | "resolved_restored";
  created_at: string;
  resolved_at: string | null;
  content: string | null;
  author_username: string | null;
  author_avatar_url: string | null;
}

function mapModerationFlagRow(row: DbModerationFlagRow): ModerationFlag {
  return {
    id: row.id,
    messageId: row.message_id,
    questionId: row.question_id,
    claimId: row.claim_id,
    evidenceId: row.evidence_id,
    entityType: row.entity_type,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
    content: row.content,
    authorUsername: row.author_username,
    authorAvatarUrl: row.author_avatar_url,
  };
}

/**
 * Submit a moderation flag report for exactly one entity
 */
export async function flagEntity(
  data: {
    messageId?: string | null;
    questionId?: string | null;
    claimId?: string | null;
    evidenceId?: string | null;
    reason: string;
  },
  overrideClient?: SupabaseClient,
): Promise<MutationIdResult> {
  const supabase = getClient(overrideClient);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Must be authenticated to report content.");
  }

  const references = [data.messageId, data.questionId, data.claimId, data.evidenceId].filter(Boolean);
  if (references.length !== 1) {
    throw new Error("Exactly one entity must be reported.");
  }

  const trimmedReason = data.reason?.trim() || "";
  if (trimmedReason.length < 5) {
    throw new Error("Please provide a reason with at least 5 characters.");
  }
  if (trimmedReason.length > 2000) {
    throw new Error("Reason must be 2000 characters or less.");
  }

  const { data: insertedId, error } = await supabase.rpc("submit_moderation_flag", {
    p_message_id: data.messageId || null,
    p_question_id: data.questionId || null,
    p_claim_id: data.claimId || null,
    p_evidence_id: data.evidenceId || null,
    p_reason: trimmedReason,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("You have already submitted a report for this item. It is currently under review.");
    }
    throw new Error(mapSupabaseError(error, "Failed to submit report."));
  }

  if (!insertedId) {
    throw new Error("Failed to submit report.");
  }

  return { id: insertedId };
}

/**
 * Fetch all pending flags through the redacted moderator queue view.
 */
export async function getPendingFlags(
  overrideClient?: SupabaseClient,
): Promise<ModerationFlag[]> {
  const supabase = getClient(overrideClient);

  const { data, error } = await supabase
    .from("moderation_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to load pending flags"));
  }

  const rows = (data || []) as unknown as DbModerationFlagRow[];

  return rows.map(mapModerationFlagRow);
}

/**
 * Fetch resolved moderation history through the redacted moderator queue view.
 */
export async function getModerationHistory(
  overrideClient?: SupabaseClient,
): Promise<ModerationFlag[]> {
  const supabase = getClient(overrideClient);

  const { data, error } = await supabase
    .from("moderation_queue")
    .select("*")
    .neq("status", "pending")
    .order("resolved_at", { ascending: false });

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to load moderation history"));
  }

  const rows = (data || []) as DbModerationFlagRow[];
  return rows.map(mapModerationFlagRow);
}

/**
 * Resolve a moderation report (moderator-only)
 */
export async function resolveFlag(
  id: string,
  status: "resolved_hidden" | "resolved_dismissed" | "resolved_restored",
  overrideClient?: SupabaseClient,
): Promise<MutationIdResult> {
  const supabase = getClient(overrideClient);

  const { data: updatedId, error } = await supabase.rpc("resolve_moderation_flag", {
    p_flag_id: id,
    p_status: status,
  });

  if (error || !updatedId) {
    throw new Error(mapSupabaseError(error, "Failed to resolve report."));
  }

  return { id: updatedId };
}

/** Row shape returned by the search_content RPC. */
export interface DbSearchResultRow {
  entity_id: string;
  result_type: SearchResultType;
  room_id: string;
  room_slug: string;
  room_title: string;
  room_type?: string | null;
  content: string | null;
  excerpt: string | null;
  author_username: string | null;
  author_avatar_url: string | null;
  created_at: string;
  rank: number;
  total_count: number;
}

export interface DbClaimRelationRow {
  id: string;
  room_id: string;
  source_claim_id: string;
  target_claim_id: string;
  relation_type: ClaimRelationType;
  created_by: string | null;
  created_at: string;
}

export interface DbDiscussionClaimRelationRow {
  id: string;
  room_id: string;
  source_claim_id: string;
  target_claim_id: string;
  relation_type: ClaimRelationType;
  created_by: string | null;
  created_at: string;
  source_claim_content: string;
  source_claim_type: string;
  target_claim_content: string;
  target_claim_type: string;
}

function mapSearchResultRow(row: DbSearchResultRow): SearchResult {
  return {
    entityId: row.entity_id,
    resultType: row.result_type,
    roomId: row.room_id,
    roomSlug: row.room_slug,
    roomTitle: row.room_title,
    roomType: (row.room_type as "discussion" | "debate") || null,
    content: row.content,
    excerpt: row.excerpt,
    authorUsername: row.author_username,
    authorAvatarUrl: row.author_avatar_url,
    createdAt: row.created_at,
    rank: row.rank,
  };
}

// ─────────────────────────────────────────────────────
// Lightweight metadata queries for section components
// ─────────────────────────────────────────────────────

/**
 * Minimal evidence shape needed by ClaimList for evidence counts and credibility.
 */
export interface EvidenceMetadata {
  id: string;
  claimId: string;
  isRetracted: boolean;
  agreeCount: number;
  disagreeCount: number;
}

/**
 * Lightweight evidence query — selects only the columns ClaimList actually reads
 * from roomEvidence, replacing the full getEvidenceForRoom fetch.
 */
export async function getEvidenceMetadataForRoom(
  roomId: string,
  overrideClient?: SupabaseClient,
): Promise<EvidenceMetadata[]> {
  const supabase = getClient(overrideClient);

  const { data, error } = await supabase
    .from("discussion_evidence")
    .select("id, claim_id, is_retracted, agree_count, disagree_count")
    .eq("room_id", roomId);

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to load evidence metadata"));
  }

  return ((data || []) as Array<{
    id: string;
    claim_id: string;
    is_retracted: boolean;
    agree_count: number | null;
    disagree_count: number | null;
  }>).map((row) => ({
    id: row.id,
    claimId: row.claim_id,
    isRetracted: row.is_retracted,
    agreeCount: row.agree_count ?? 0,
    disagreeCount: row.disagree_count ?? 0,
  }));
}

/**
 * Minimal claim relation shape needed by ClaimList for relation counts.
 */
export interface ClaimRelationCount {
  sourceClaimId: string;
  targetClaimId: string;
  relationType: ClaimRelationType;
}

/**
 * Lightweight claim relations query — selects only the columns ClaimList needs
 * to compute outgoingSupports/OutgoingContradicts/outgoingRefines/incoming counts,
 * replacing the full getClaimRelations fetch.
 */
export async function getClaimRelationCounts(
  roomId: string,
  overrideClient?: SupabaseClient,
): Promise<ClaimRelationCount[]> {
  const supabase = getClient(overrideClient);

  const { data, error } = await supabase
    .from("discussion_claim_relations")
    .select("source_claim_id, target_claim_id, relation_type")
    .eq("room_id", roomId);

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to load claim relation counts"));
  }

  return ((data || []) as Array<{
    source_claim_id: string;
    target_claim_id: string;
    relation_type: ClaimRelationType;
  }>).map((row) => ({
    sourceClaimId: row.source_claim_id,
    targetClaimId: row.target_claim_id,
    relationType: row.relation_type,
  }));
}

// ─────────────────────────────────────────────────────
// Section-level cursor pagination helpers
// ─────────────────────────────────────────────────────

const SECTION_CURSOR_SEP = "|";

/** Encode a section cursor: `{createdAt}|{id}` */
export function encodeSectionCursor(createdAt: string, id: string): string {
  return `${createdAt}${SECTION_CURSOR_SEP}${id}`;
}

/** Decode a section cursor, returning null on invalid input. */
export function parseSectionCursor(cursor: string): { createdAt: string; id: string } | null {
  const sepIndex = cursor.indexOf(SECTION_CURSOR_SEP);
  if (sepIndex <= 0 || sepIndex === cursor.length - 1) return null;
  return { createdAt: cursor.slice(0, sepIndex), id: cursor.slice(sepIndex + 1) };
}

const DEFAULT_SECTION_PAGE_SIZE = 15;

// ─────────────────────────────────────────────────────
// Paginated section queries
// ─────────────────────────────────────────────────────

export interface SectionPage<T> {
  items: T[];
  nextCursor: string | null;
}

/**
 * Paginated claims for a room. Supports optional questionId and debateSide filters.
 */
export async function getClaimsPaginated(
  roomId: string,
  opts?: {
    pageSize?: number;
    cursor?: string;
    questionId?: string | null;
    debateSide?: "proposition" | "opposition" | null;
    overrideClient?: SupabaseClient;
  },
): Promise<SectionPage<DiscussionClaim>> {
  const supabase = getClient(opts?.overrideClient);
  const limit = opts?.pageSize ?? DEFAULT_SECTION_PAGE_SIZE;

  let query = supabase
    .from("discussion_claims")
    .select("*")
    .eq("room_id", roomId);

  if (opts?.questionId) {
    query = query.eq("question_id", opts.questionId);
  }
  if (opts?.debateSide) {
    query = query.eq("debate_side", opts.debateSide);
  }

  if (opts?.cursor) {
    const parsed = parseSectionCursor(opts.cursor);
    if (parsed) {
      query = query.or(
        `created_at.lt.${parsed.createdAt},and(created_at.eq.${parsed.createdAt},id.lt.${parsed.id})`,
      );
    }
  }

  query = query.order("created_at", { ascending: false }).order("id", { ascending: false }).limit(limit + 1);

  const { data, error } = await query;
  if (error) throw new Error(mapSupabaseError(error, "Failed to load claims"));

  const rows = (data || []) as DbDiscussionClaimRow[];
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map(mapDiscussionClaimRow);
  const last = items[items.length - 1];

  return {
    items,
    nextCursor: hasMore && last ? encodeSectionCursor(last.createdAt, last.id) : null,
  };
}

export interface MinimalClaim {
  id: string;
  content: string;
  debateSide: "proposition" | "opposition" | null;
}

/**
 * Lightweight bounded claim lookup (id/content/debateSide) used to populate the
 * "Target Claim" dropdown in the debate inquiries tab without loading full claim
 * relations or evidence. Bounded to a single page so it never scans the room.
 */
export async function getClaimsMinimal(
  roomId: string,
  opts?: { pageSize?: number; overrideClient?: SupabaseClient },
): Promise<MinimalClaim[]> {
  const supabase = getClient(opts?.overrideClient);
  const limit = opts?.pageSize ?? DEFAULT_SECTION_PAGE_SIZE;

  const { data, error } = await supabase
    .from("discussion_claims")
    .select("id, content, debate_side")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (error) throw new Error(mapSupabaseError(error, "Failed to load claim options"));

  return ((data || []) as { id: string; content: string; debate_side: string | null }[]).map((row) => ({
    id: row.id,
    content: row.content,
    debateSide: row.debate_side === "proposition" || row.debate_side === "opposition" ? row.debate_side : null,
  }));
}

/**
 * Fetch a single claim by ID for target resolution.
 * `roomId` is required for defense-in-depth to prevent cross-room lookups.
 */
export async function getClaimById(
  claimId: string,
  roomId: string,
  overrideClient?: SupabaseClient,
): Promise<DiscussionClaim | null> {
  const supabase = getClient(overrideClient);
  const { data, error } = await supabase
    .from("discussion_claims")
    .select("*")
    .eq("id", claimId)
    .eq("room_id", roomId)
    .maybeSingle();

  if (error) throw new Error(mapSupabaseError(error, "Failed to load claim"));
  return data ? mapDiscussionClaimRow(data as DbDiscussionClaimRow) : null;
}

/**
 * Batch-fetch claims by a bounded set of IDs within a room. Used to resolve the
 * claim content snippets referenced by a paginated evidence list without scanning
 * the entire room collection.
 */
export async function getClaimsByIds(
  claimIds: string[],
  roomId: string,
  overrideClient?: SupabaseClient,
): Promise<DiscussionClaim[]> {
  if (claimIds.length === 0) return [];
  const supabase = getClient(overrideClient);

  const { data, error } = await supabase
    .from("discussion_claims")
    .select("*")
    .eq("room_id", roomId)
    .in("id", claimIds);

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to load claims"));
  }

  const rows = (data || []) as DbDiscussionClaimRow[];
  return rows.map(mapDiscussionClaimRow);
}

/**
 * Paginated evidence for a room. Supports optional direction filter.
 */
export async function getEvidencePaginated(
  roomId: string,
  opts?: {
    pageSize?: number;
    cursor?: string;
    direction?: "support" | "contradict" | "context" | null;
    overrideClient?: SupabaseClient;
  },
): Promise<SectionPage<DiscussionEvidence>> {
  const supabase = getClient(opts?.overrideClient);
  const limit = opts?.pageSize ?? DEFAULT_SECTION_PAGE_SIZE;

  let query = supabase
    .from("discussion_evidence")
    .select("*")
    .eq("room_id", roomId);

  if (opts?.direction) {
    query = query.eq("direction", opts.direction);
  }

  if (opts?.cursor) {
    const parsed = parseSectionCursor(opts.cursor);
    if (parsed) {
      query = query.or(
        `created_at.lt.${parsed.createdAt},and(created_at.eq.${parsed.createdAt},id.lt.${parsed.id})`,
      );
    }
  }

  query = query.order("created_at", { ascending: false }).order("id", { ascending: false }).limit(limit + 1);

  const { data, error } = await query;
  if (error) throw new Error(mapSupabaseError(error, "Failed to load evidence"));

  const rows = (data || []) as DbDiscussionEvidenceRow[];
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map(mapDiscussionEvidenceRow);
  const last = items[items.length - 1];

  return {
    items,
    nextCursor: hasMore && last ? encodeSectionCursor(last.createdAt, last.id) : null,
  };
}

/**
 * Fetch a single evidence record by ID for target resolution.
 * `roomId` is required for defense-in-depth.
 */
export async function getEvidenceById(
  evidenceId: string,
  roomId: string,
  overrideClient?: SupabaseClient,
): Promise<DiscussionEvidence | null> {
  const supabase = getClient(overrideClient);
  const { data, error } = await supabase
    .from("discussion_evidence")
    .select("*")
    .eq("id", evidenceId)
    .eq("room_id", roomId)
    .maybeSingle();

  if (error) throw new Error(mapSupabaseError(error, "Failed to load evidence"));
  return data ? mapDiscussionEvidenceRow(data as DbDiscussionEvidenceRow) : null;
}

/**
 * Paginated messages (contributions) for a room.
 */
export async function getMessagesPaginated(
  roomId: string,
  opts?: {
    pageSize?: number;
    cursor?: string;
    overrideClient?: SupabaseClient;
  },
): Promise<SectionPage<DiscussionMessage>> {
  const supabase = getClient(opts?.overrideClient);
  const limit = opts?.pageSize ?? DEFAULT_SECTION_PAGE_SIZE;

  let query = supabase
    .from("discussion_messages")
    .select("*")
    .eq("room_id", roomId);

  if (opts?.cursor) {
    const parsed = parseSectionCursor(opts.cursor);
    if (parsed) {
      query = query.or(
        `created_at.lt.${parsed.createdAt},and(created_at.eq.${parsed.createdAt},id.lt.${parsed.id})`,
      );
    }
  }

  query = query.order("created_at", { ascending: true }).order("id", { ascending: true }).limit(limit + 1);

  const { data, error } = await query;
  if (error) throw new Error(mapSupabaseError(error, "Failed to load messages"));

  const rows = (data || []) as DbDiscussionMessageRow[];
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map(mapDiscussionMessageRow);
  const last = items[items.length - 1];

  return {
    items,
    nextCursor: hasMore && last ? encodeSectionCursor(last.createdAt, last.id) : null,
  };
}

/**
 * Fetch a single message by ID for target resolution.
 * `roomId` is required for defense-in-depth.
 */
export async function getMessageById(
  messageId: string,
  roomId: string,
  overrideClient?: SupabaseClient,
): Promise<DiscussionMessage | null> {
  const supabase = getClient(overrideClient);
  const { data, error } = await supabase
    .from("discussion_messages")
    .select("*")
    .eq("id", messageId)
    .eq("room_id", roomId)
    .maybeSingle();

  if (error) throw new Error(mapSupabaseError(error, "Failed to load message"));
  return data ? mapDiscussionMessageRow(data as DbDiscussionMessageRow) : null;
}

/**
 * Paginated ROOT messages for a room (parent_message_id IS NULL), ascending by
 * (created_at, id). Used to load contribution threads a few roots at a time so
 * that the full room message collection is never fetched at once.
 */
export async function getMessageRoots(
  roomId: string,
  opts?: {
    pageSize?: number;
    cursor?: string;
    overrideClient?: SupabaseClient;
  },
): Promise<SectionPage<DiscussionMessage>> {
  const supabase = getClient(opts?.overrideClient);
  const limit = opts?.pageSize ?? DEFAULT_SECTION_PAGE_SIZE;

  let query = supabase
    .from("discussion_messages")
    .select("*")
    .eq("room_id", roomId)
    .is("parent_message_id", null);

  if (opts?.cursor) {
    const parsed = parseSectionCursor(opts.cursor);
    if (parsed) {
      query = query.or(
        `created_at.gt.${parsed.createdAt},and(created_at.eq.${parsed.createdAt},id.gt.${parsed.id})`,
      );
    }
  }

  query = query.order("created_at", { ascending: true }).order("id", { ascending: true }).limit(limit + 1);

  const { data, error } = await query;
  if (error) throw new Error(mapSupabaseError(error, "Failed to load contribution threads"));

  const rows = (data || []) as DbDiscussionMessageRow[];
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map(mapDiscussionMessageRow);
  const last = items[items.length - 1];

  return {
    items,
    nextCursor: hasMore && last ? encodeSectionCursor(last.createdAt, last.id) : null,
  };
}

/**
 * Total count of contributions in a room, room-scoped, using PostgREST's exact
 * count (head only — no message bodies fetched). Lets the contributions header
 * keep a true total while threads are paginated.
 */
export async function getRoomMessageCount(roomId: string, overrideClient?: SupabaseClient): Promise<number> {
  const supabase = getClient(overrideClient);
  const { count, error } = await supabase
    .from("discussion_messages")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId);
  if (error) throw new Error(mapSupabaseError(error, "Failed to count contributions"));
  return count ?? 0;
}

/**
 * Bounded descendant lookup for a set of parent message ids, always constrained
 * to the given room so a cross-room parent id can never leak a message.
 */
export async function getMessagesByParentIds(
  roomId: string,
  parentIds: string[],
  overrideClient?: SupabaseClient,
): Promise<DiscussionMessage[]> {
  if (parentIds.length === 0) return [];
  const supabase = getClient(overrideClient);

  const { data, error } = await supabase
    .from("discussion_messages")
    .select("*")
    .eq("room_id", roomId)
    .in("parent_message_id", parentIds)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) throw new Error(mapSupabaseError(error, "Failed to load replies"));

  return ((data || []) as DbDiscussionMessageRow[]).map(mapDiscussionMessageRow);
}

/**
 * Fetch the COMPLETE descendant subtree for a bounded set of root ids via
 * level-by-level parent walks (never the whole room). Returns all descendants
 * (not including the roots themselves).
 */
export async function getMessageSubtreeDescendants(
  roomId: string,
  rootIds: string[],
  overrideClient?: SupabaseClient,
): Promise<DiscussionMessage[]> {
  const all: DiscussionMessage[] = [];
  let currentLevel = rootIds;
  let guard = 0;
  while (currentLevel.length > 0 && guard < 32) {
    const children = await getMessagesByParentIds(roomId, currentLevel, overrideClient);
    if (children.length === 0) break;
    all.push(...children);
    currentLevel = children.map((c) => c.id);
    guard += 1;
  }
  return all;
}

/**
 * Walk a message's parent chain upward to its root, room-scoped, and return the
 * ancestors from immediate parent up to the root (target itself excluded).
 */
export async function getMessageAncestors(
  roomId: string,
  messageId: string,
  overrideClient?: SupabaseClient,
): Promise<DiscussionMessage[]> {
  const supabase = getClient(overrideClient);
  const ancestors: DiscussionMessage[] = [];
  let currentId: string | null = messageId;
  let guard = 0;
  while (currentId && guard < 64) {
    const { data, error } = await supabase
      .from("discussion_messages")
      .select("*")
      .eq("id", currentId)
      .eq("room_id", roomId)
      .maybeSingle();
    if (error) throw new Error(mapSupabaseError(error, "Failed to resolve contribution"));
    if (!data) break;
    const row = data as DbDiscussionMessageRow;
    if (row.parent_message_id === null) break;
    ancestors.unshift(mapDiscussionMessageRow(row));
    currentId = row.parent_message_id;
    guard += 1;
  }
  return ancestors;
}

/**
 * Resolve a single message plus its complete ancestor-root thread, all
 * room-scoped. Returns null when the target does not exist in the room, so the
 * caller can render a clean "unavailable" state without fabricating content.
 */
export async function resolveMessageThread(
  roomId: string,
  messageId: string,
  overrideClient?: SupabaseClient,
): Promise<{ targetId: string; thread: DiscussionMessage[] } | null> {
  const target = await getMessageById(messageId, roomId, overrideClient);
  if (!target) return null;

  if (target.parentMessageId === null) {
    const descendants = await getMessageSubtreeDescendants(roomId, [target.id], overrideClient);
    return { targetId: target.id, thread: [target, ...descendants] };
  }

  const ancestors = await getMessageAncestors(roomId, target.id, overrideClient);
  if (ancestors.length === 0) return null;
  const root = ancestors[ancestors.length - 1];
  const descendants = await getMessageSubtreeDescendants(roomId, [root.id], overrideClient);
  return { targetId: target.id, thread: [root, ...descendants] };
}

/**
 * Paginated questions for a room.
 */
export async function getQuestionsPaginated(
  roomId: string,
  opts?: {
    pageSize?: number;
    cursor?: string;
    overrideClient?: SupabaseClient;
  },
): Promise<SectionPage<DiscussionQuestion>> {
  const supabase = getClient(opts?.overrideClient);
  const limit = opts?.pageSize ?? DEFAULT_SECTION_PAGE_SIZE;

  let query = supabase
    .from("discussion_questions")
    .select("*")
    .eq("room_id", roomId);

  if (opts?.cursor) {
    const parsed = parseSectionCursor(opts.cursor);
    if (parsed) {
      query = query.or(
        `created_at.lt.${parsed.createdAt},and(created_at.eq.${parsed.createdAt},id.lt.${parsed.id})`,
      );
    }
  }

  query = query.order("created_at", { ascending: false }).order("id", { ascending: false }).limit(limit + 1);

  const { data, error } = await query;
  if (error) throw new Error(mapSupabaseError(error, "Failed to load questions"));

  const rows = (data || []) as DbDiscussionQuestionRow[];
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map(mapDiscussionQuestionRow);
  const last = items[items.length - 1];

  return {
    items,
    nextCursor: hasMore && last ? encodeSectionCursor(last.createdAt, last.id) : null,
  };
}

/**
 * Fetch a single question by ID for target resolution.
 * `roomId` is required for defense-in-depth.
 */
export async function getQuestionById(
  questionId: string,
  roomId: string,
  overrideClient?: SupabaseClient,
): Promise<DiscussionQuestion | null> {
  const supabase = getClient(overrideClient);
  const { data, error } = await supabase
    .from("discussion_questions")
    .select("*")
    .eq("id", questionId)
    .eq("room_id", roomId)
    .maybeSingle();

  if (error) throw new Error(mapSupabaseError(error, "Failed to load question"));
  return data ? mapDiscussionQuestionRow(data as DbDiscussionQuestionRow) : null;
}

/**
 * Full-text search across rooms, messages, claims, evidence, and questions.
 */
export async function searchContent(
  query: string,
  options?: { limit?: number; offset?: number },
  overrideClient?: SupabaseClient,
): Promise<{ results: SearchResult[]; totalCount: number; query: string; hasMore: boolean }> {
  const supabase = getClient(overrideClient);

  const trimmedQuery = query.trim();
  if (!trimmedQuery || trimmedQuery.length < 2) {
    return { results: [], totalCount: 0, query: trimmedQuery, hasMore: false };
  }

  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;

  const { data, error } = await supabase.rpc("search_content", {
    p_query: trimmedQuery,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    throw new Error(mapSupabaseError(error, "Search failed"));
  }

  const rows = (data || []) as DbSearchResultRow[];
  const results = rows.map(mapSearchResultRow);

  const totalCount = rows.length > 0 ? rows[0].total_count : 0;
  const hasMore = offset + limit < totalCount;

  return { results, totalCount, query: trimmedQuery, hasMore };
}
