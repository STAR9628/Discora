  import type { SupabaseClient } from "@supabase/supabase-js";
  import { createBrowserSupabaseClient } from "@/services/supabase/client";
  import { mapSupabaseError } from "@/lib/errors";
  import type { Topic, Room, Discussion, Message, DiscussionMessage, Claim, DiscussionClaim, DiscussionEvidence, Question, DiscussionQuestion, QuestionType, ModerationFlag, SearchResult, SearchResultType } from "../types";

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
    message_type: "message" | "question";
    created_at: string;
    updated_at: string;
  }

  export interface DbDiscussionMessageRow {
    id: string;
    room_id: string;
    parent_message_id: string | null;
    content: string;
    identity_mode: "public" | "anonymous";
    message_type: "message" | "question";
    created_at: string;
    updated_at: string;
    user_id: string | null;
    username: string | null;
    avatar_url: string | null;
    is_moderated: boolean;
  }

  export interface DbJoinedRoomRow extends DbRoomRow {
    topics: DbTopicRow | null;
    discussions: DbDiscussionRow | null;
  }

  export interface DiscussionFeedItem {
    room: Room;
    topic: Topic | null;
    discussion: Discussion | null;
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
      createdAt: row.created_at,
      updatedAt: row.updated_at,
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
        discussions!left (*)
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
        discussions!left (*)
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
    question_id: string | null; // added
    content: string;
    claim_type: "fact" | "opinion" | "prediction" | "proposal" | "observation";
    identity_mode: "public" | "anonymous";
    is_retracted: boolean;
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
    question_id: string | null; // added
    content: string;
    claim_type: "fact" | "opinion" | "prediction" | "proposal" | "observation";
    identity_mode: "public" | "anonymous";
    is_retracted: boolean;
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
      questionId: row.question_id, // added
      content: row.content,
      claimType: row.claim_type,
      identityMode: row.identity_mode,
      isRetracted: row.is_retracted,
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
      questionId: row.question_id, // added
      content: row.content,
      claimType: row.claim_type,
      identityMode: row.identity_mode,
      isRetracted: row.is_retracted,
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
      identityMode: "public" | "anonymous";
      originMessageId?: string | null;
      questionId?: string | null;
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
        identity_mode: data.identityMode,
        origin_message_id: data.originMessageId || null,
        question_id: data.questionId || null,
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
    content: string | null;
    excerpt: string | null;
    author_username: string | null;
    author_avatar_url: string | null;
    created_at: string;
    rank: number;
    total_count: number;
  }

  function mapSearchResultRow(row: DbSearchResultRow): SearchResult {
    return {
      entityId: row.entity_id,
      resultType: row.result_type,
      roomId: row.room_id,
      roomSlug: row.room_slug,
      roomTitle: row.room_title,
      content: row.content,
      excerpt: row.excerpt,
      authorUsername: row.author_username,
      authorAvatarUrl: row.author_avatar_url,
      createdAt: row.created_at,
      rank: row.rank,
    };
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
