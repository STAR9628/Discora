import type { SupabaseClient } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/services/supabase/client";
import { mapSupabaseError } from "@/lib/errors";
import type { DiscussionClaim, DiscussionEvidence, DiscussionQuestion } from "@/features/discussions/types";
import type { ExpertiseArea, ReputationSnapshot, UserContributions } from "../types";

interface DbDiscussionClaimRow {
  id: string;
  room_id: string;
  origin_message_id: string | null;
  question_id: string | null;
  content: string;
  claim_type: string;
  context_type: string;
  identity_mode: string;
  is_retracted: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  username: string | null;
  avatar_url: string | null;
  agree_count: number;
  disagree_count: number;
  consensus_ratio: number | null;
  user_vote: string | null;
}

interface DbDiscussionEvidenceRow {
  id: string;
  room_id: string;
  source_id: string;
  content: string;
  evidence_type: string;
  identity_mode: string;
  is_retracted: boolean;
  created_at: string;
  updated_at: string;
  claim_id: string;
  direction: string;
  created_by: string | null;
  username: string | null;
  avatar_url: string | null;
  source_title: string;
  source_url: string | null;
  source_file_path: string | null;
  source_is_retracted: boolean;
  agree_count: number;
  disagree_count: number;
  consensus_ratio: number | null;
  user_vote: string | null;
}

interface DbDiscussionQuestionRow {
  id: string;
  room_id: string;
  content: string;
  question_type: string;
  identity_mode: string;
  is_retracted: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface DbReputationSnapshotRow {
  id: string;
  user_id: string;
  score: number;
  expertise: Record<string, unknown>[];
  created_at: string;
}

function mapClaimRow(row: DbDiscussionClaimRow): DiscussionClaim {
  return {
    id: row.id,
    roomId: row.room_id,
    originMessageId: row.origin_message_id,
    questionId: row.question_id,
    content: row.content,
    claimType: row.claim_type as DiscussionClaim["claimType"],
    contextType: row.context_type as DiscussionClaim["contextType"],
    identityMode: row.identity_mode as DiscussionClaim["identityMode"],
    isRetracted: row.is_retracted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    username: row.username,
    avatarUrl: row.avatar_url,
    agreeCount: row.agree_count,
    disagreeCount: row.disagree_count,
    consensusRatio: row.consensus_ratio,
    userVote: row.user_vote as "agree" | "disagree" | null,
  };
}

function mapEvidenceRow(row: DbDiscussionEvidenceRow): DiscussionEvidence {
  return {
    id: row.id,
    roomId: row.room_id,
    sourceId: row.source_id,
    content: row.content,
    evidenceType: row.evidence_type as DiscussionEvidence["evidenceType"],
    identityMode: row.identity_mode as DiscussionEvidence["identityMode"],
    isRetracted: row.is_retracted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    claimId: row.claim_id,
    direction: row.direction as DiscussionEvidence["direction"],
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
    userVote: row.user_vote as "agree" | "disagree" | null,
  };
}

function mapQuestionRow(row: DbDiscussionQuestionRow): DiscussionQuestion {
  return {
    id: row.id,
    roomId: row.room_id,
    content: row.content,
    questionType: row.question_type as DiscussionQuestion["questionType"],
    identityMode: row.identity_mode as DiscussionQuestion["identityMode"],
    isRetracted: row.is_retracted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    username: row.username,
    avatarUrl: row.avatar_url,
  };
}

function mapSnapshotRow(row: DbReputationSnapshotRow): ReputationSnapshot {
  return {
    id: row.id,
    userId: row.user_id,
    score: row.score,
    expertise: (row.expertise || []) as unknown as ExpertiseArea[],
    createdAt: row.created_at,
  };
}

function getClient(overrideClient?: SupabaseClient): SupabaseClient {
  return overrideClient || createBrowserSupabaseClient();
}

export async function resolveRoomSlugs(
  roomIds: string[],
  overrideClient?: SupabaseClient,
): Promise<Map<string, { slug: string; title: string }>> {
  const supabase = getClient(overrideClient);
  const uniqueIds = [...new Set(roomIds)].filter(Boolean);
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("rooms")
    .select("id, slug, title")
    .in("id", uniqueIds);

  if (error) {
    console.error("Failed to resolve room slugs:", error);
    return new Map();
  }

  const map = new Map<string, { slug: string; title: string }>();
  for (const row of data || []) {
    map.set(row.id, { slug: row.slug, title: row.title });
  }
  return map;
}

export async function getUserContributions(
  userId: string,
  overrideClient?: SupabaseClient,
): Promise<UserContributions> {
  const supabase = getClient(overrideClient);

  const [claimsRes, evidenceRes, questionsRes, discussionsRes, debatesRes, participationRes] = await Promise.all([
    supabase
      .from("discussion_claims")
      .select("*")
      .eq("created_by", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("discussion_evidence")
      .select("*")
      .eq("created_by", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("discussion_questions")
      .select("*")
      .eq("created_by", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("rooms")
      .select("id")
      .eq("created_by", userId)
      .eq("room_type", "discussion"),
    supabase
      .from("rooms")
      .select("id")
      .eq("created_by", userId)
      .eq("room_type", "debate"),
    supabase
      .from("debate_participants")
      .select("room_id, side")
      .eq("user_id", userId),
  ]);

  if (claimsRes.error) {
    throw new Error(mapSupabaseError(claimsRes.error, "Failed to load claims"));
  }
  if (evidenceRes.error) {
    throw new Error(mapSupabaseError(evidenceRes.error, "Failed to load evidence"));
  }
  if (questionsRes.error) {
    throw new Error(mapSupabaseError(questionsRes.error, "Failed to load questions"));
  }
  if (discussionsRes.error) {
    throw new Error(mapSupabaseError(discussionsRes.error, "Failed to load discussion count"));
  }
  if (debatesRes.error) {
    throw new Error(mapSupabaseError(debatesRes.error, "Failed to load debate count"));
  }

  const participations = (participationRes.data || []) as { room_id: string; side: string }[];
  let debateWins = 0;
  let debateLosses = 0;
  if (participations.length > 0) {
    const participantRoomIds = participations.map((p) => p.room_id);
    const { data: resolutions } = await supabase
      .from("discussion_debates")
      .select("id, resolution")
      .in("id", participantRoomIds)
      .not("resolution", "is", null);

    for (const row of (resolutions || []) as { id: string; resolution: Record<string, unknown> | null }[]) {
      const res = row.resolution as { winner?: string } | null;
      if (!res || !res.winner || res.winner === "draw") continue;
      const userSide = participations.find((p) => p.room_id === row.id)?.side;
      if (userSide === res.winner) debateWins++;
      else debateLosses++;
    }
  }

  // Fetch evidence vote counts (votes on evidence created by user)
  const userEvidenceIds = (evidenceRes.data || []).map((e: { id: string }) => e.id);
  let evidenceAgreeCount = 0;
  let evidenceDisagreeCount = 0;
  if (userEvidenceIds.length > 0) {
    const { data: evVotes } = await supabase
      .from("evidence_votes")
      .select("vote_type")
      .in("evidence_id", userEvidenceIds);
    if (evVotes) {
      evidenceAgreeCount = (evVotes as { vote_type: string }[]).filter((v) => v.vote_type === "agree").length;
      evidenceDisagreeCount = (evVotes as { vote_type: string }[]).filter((v) => v.vote_type === "disagree").length;
    }
  }

  return {
    claims: (claimsRes.data || []).map(mapClaimRow),
    evidence: (evidenceRes.data || []).map(mapEvidenceRow),
    questions: (questionsRes.data || []).map(mapQuestionRow),
    discussionCount: discussionsRes.data?.length || 0,
    debateCount: debatesRes.data?.length || 0,
    debateParticipations: participations.map((p) => p.room_id),
    debateWins,
    debateLosses,
    evidenceAgreeCount,
    evidenceDisagreeCount,
  };
}

export async function saveReputationSnapshot(
  userId: string,
  score: number,
  expertise: ExpertiseArea[],
  overrideClient?: SupabaseClient,
): Promise<ReputationSnapshot> {
  const supabase = getClient(overrideClient);
  const { data, error } = await supabase
    .from("user_reputation_snapshots")
    .insert({
      user_id: userId,
      score,
      expertise: JSON.parse(JSON.stringify(expertise)),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to save reputation snapshot"));
  }
  return mapSnapshotRow(data);
}

export async function callRecalculateReputation(
  userId: string,
  overrideClient?: SupabaseClient,
): Promise<number> {
  const supabase = getClient(overrideClient);
  const { data, error } = await supabase.rpc("recalculate_user_reputation", {
    p_user_id: userId,
  });

  if (error) {
    console.error("Failed to recalculate reputation:", error);
    return 0;
  }
  return (data as number) || 0;
}

export async function getReputationEvents(
  userId: string,
  overrideClient?: SupabaseClient,
): Promise<{ eventType: string; points: number; metadata: Record<string, unknown>; createdAt: string }[]> {
  const supabase = getClient(overrideClient);
  const { data, error } = await supabase
    .from("reputation_events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load reputation events:", error);
    return [];
  }
  return ((data || []) as {
    event_type: string;
    points: number;
    metadata: Record<string, unknown>;
    created_at: string;
  }[]).map((r) => ({
    eventType: r.event_type,
    points: r.points,
    metadata: r.metadata,
    createdAt: r.created_at,
  }));
}

export async function getLeaderboardData(
  limit = 50,
  overrideClient?: SupabaseClient,
): Promise<{ userId: string; username: string; avatarUrl: string | null; claimCount: number; evidenceCount: number; questionCount: number; debateCount: number; debateWins: number }[]> {
  const supabase = getClient(overrideClient);

  const [claimsRes, evidenceRes, questionsRes, debateParticipationsRes, resolutionsRes] = await Promise.all([
    supabase.from("discussion_claims").select("created_by, username, avatar_url, is_retracted"),
    supabase.from("discussion_evidence").select("created_by, username, avatar_url, is_retracted"),
    supabase.from("discussion_questions").select("created_by, username, avatar_url, is_retracted"),
    supabase.from("debate_participants").select("user_id, room_id, side"),
    supabase.from("discussion_debates").select("id, resolution").not("resolution", "is", null),
  ]);

  const userMap = new Map<string, { username: string; avatarUrl: string | null; claimCount: number; evidenceCount: number; questionCount: number; debateCount: number; debateWins: number }>();

  for (const row of (claimsRes.data || []) as { created_by: string | null; username: string | null; avatar_url: string | null; is_retracted: boolean }[]) {
    if (row.created_by && !row.is_retracted) {
      if (!userMap.has(row.created_by)) {
        userMap.set(row.created_by, { username: row.username || "Unknown", avatarUrl: row.avatar_url, claimCount: 0, evidenceCount: 0, questionCount: 0, debateCount: 0, debateWins: 0 });
      }
      userMap.get(row.created_by)!.claimCount++;
    }
  }
  for (const row of (evidenceRes.data || []) as { created_by: string | null; username: string | null; avatar_url: string | null; is_retracted: boolean }[]) {
    if (row.created_by && !row.is_retracted) {
      if (!userMap.has(row.created_by)) {
        userMap.set(row.created_by, { username: row.username || "Unknown", avatarUrl: row.avatar_url, claimCount: 0, evidenceCount: 0, questionCount: 0, debateCount: 0, debateWins: 0 });
      }
      userMap.get(row.created_by)!.evidenceCount++;
    }
  }
  for (const row of (questionsRes.data || []) as { created_by: string | null; username: string | null; avatar_url: string | null; is_retracted: boolean }[]) {
    if (row.created_by && !row.is_retracted) {
      if (!userMap.has(row.created_by)) {
        userMap.set(row.created_by, { username: row.username || "Unknown", avatarUrl: row.avatar_url, claimCount: 0, evidenceCount: 0, questionCount: 0, debateCount: 0, debateWins: 0 });
      }
      userMap.get(row.created_by)!.questionCount++;
    }
  }

  // Debate participation counts
  const debateParticipations = (debateParticipationsRes.data || []) as { user_id: string; room_id: string; side: string }[];
  const resolutionMap = new Map<string, { winner: string }>();
  for (const row of (resolutionsRes.data || []) as { id: string; resolution: Record<string, unknown> | null }[]) {
    const res = row.resolution as { winner?: string } | null;
    if (res && res.winner && res.winner !== "draw") {
      resolutionMap.set(row.id, { winner: res.winner });
    }
  }

  for (const p of debateParticipations) {
    if (!userMap.has(p.user_id)) {
      userMap.set(p.user_id, { username: "Unknown", avatarUrl: null, claimCount: 0, evidenceCount: 0, questionCount: 0, debateCount: 0, debateWins: 0 });
    }
    userMap.get(p.user_id)!.debateCount++;
    const resolution = resolutionMap.get(p.room_id);
    if (resolution && p.side === resolution.winner) {
      userMap.get(p.user_id)!.debateWins++;
    }
  }

  return Array.from(userMap.entries())
    .map(([userId, data]) => ({
      userId,
      username: data.username,
      avatarUrl: data.avatarUrl,
      claimCount: data.claimCount,
      evidenceCount: data.evidenceCount,
      questionCount: data.questionCount,
      debateCount: data.debateCount,
      debateWins: data.debateWins,
    }))
    .sort((a, b) => (b.claimCount + b.evidenceCount + b.questionCount + b.debateCount) - (a.claimCount + a.evidenceCount + a.questionCount + a.debateCount))
    .slice(0, limit);
}

export async function getLatestReputationSnapshots(
  userIds: string[],
  overrideClient?: SupabaseClient,
): Promise<Map<string, ReputationSnapshot>> {
  const supabase = getClient(overrideClient);
  const uniqueIds = [...new Set(userIds)].filter(Boolean);
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("user_reputation_snapshots")
    .select("*")
    .in("user_id", uniqueIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load reputation snapshots:", error);
    return new Map();
  }

  const map = new Map<string, ReputationSnapshot>();
  for (const row of data || []) {
    const snapshot = mapSnapshotRow(row as DbReputationSnapshotRow);
    if (!map.has(snapshot.userId)) {
      map.set(snapshot.userId, snapshot);
    }
  }
  return map;
}

export async function getReputationHistory(
  userId: string,
  overrideClient?: SupabaseClient,
): Promise<ReputationSnapshot[]> {
  const supabase = getClient(overrideClient);
  const { data, error } = await supabase
    .from("user_reputation_snapshots")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to load reputation history"));
  }
  return (data || []).map(mapSnapshotRow);
}

export async function getUserSideChanges(
  userId: string,
  overrideClient?: SupabaseClient,
): Promise<{ id: string; roomId: string; previousSide: string; newSide: string; reason: string; createdAt: string }[]> {
  const supabase = getClient(overrideClient);

  const { data, error } = await supabase
    .from("debate_side_changes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to load side changes"));
  }

  return (data || []).map((row: {
    id: string;
    room_id: string;
    user_id: string;
    previous_side: string;
    new_side: string;
    reason: string;
    created_at: string;
  }) => ({
    id: row.id,
    roomId: row.room_id,
    previousSide: row.previous_side,
    newSide: row.new_side,
    reason: row.reason,
    createdAt: row.created_at,
  }));
}
