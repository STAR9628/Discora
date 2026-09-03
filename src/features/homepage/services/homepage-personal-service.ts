import { createBrowserSupabaseClient } from "@/services/supabase/client";
import { mapSupabaseError } from "@/lib/errors";

export interface MyOpenInquiry {
  id: string;
  roomId: string;
  roomTitle: string;
  roomSlug: string;
  content: string;
  inquiryType: string;
  status: string;
  targetClaimContent: string | null;
  responseCount: number;
  createdAt: string;
}

export interface InquiryResponse {
  inquiryId: string;
  inquiryContent: string;
  inquiryType: string;
  roomId: string;
  roomTitle: string;
  roomSlug: string;
  latestResponseContent: string | null;
  latestResponseUsername: string | null;
  responseCount: number;
  updatedAt: string;
}

export interface DebateAttention {
  roomId: string;
  title: string;
  slug: string;
  propositionTitle: string;
  oppositionTitle: string;
  status: string;
  mySide: string;
  myClaimCount: number;
  opposingClaimCount: number;
  lastActivityAt: string | null;
}

export interface TopicEvidence {
  topicId: string;
  topicName: string;
  evidenceCount: number;
  rooms: { roomId: string; roomTitle: string; roomSlug: string }[];
}

export interface UnderstandingEvolved {
  claimId: string;
  claimContent: string;
  roomId: string;
  roomTitle: string;
  roomSlug: string;
  myVote: string;
  agreeCount: number;
  disagreeCount: number;
  consensusRatio: number | null;
  evidenceCount: number;
  latestEvidence: string | null;
}

export async function getMyOpenInquiries(): Promise<MyOpenInquiry[]> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.rpc("get_my_open_inquiries");
  if (error) throw new Error(mapSupabaseError(error, "Failed to load inquiries"));
  return ((data || []) as Record<string, unknown>[]).map(mapOpenInquiry);
}

export async function getMyInquiryResponses(): Promise<InquiryResponse[]> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.rpc("get_my_inquiry_responses");
  if (error) throw new Error(mapSupabaseError(error, "Failed to load inquiry responses"));
  return ((data || []) as Record<string, unknown>[]).map(mapInquiryResponseRow);
}

export async function getMyDebatesAttention(): Promise<DebateAttention[]> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.rpc("get_my_debates_attention");
  if (error) throw new Error(mapSupabaseError(error, "Failed to load debate updates"));
  return ((data || []) as Record<string, unknown>[]).map(mapDebateAttention);
}

export async function getMyTopicEvidence(days: number = 7): Promise<TopicEvidence[]> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.rpc("get_my_topic_evidence", { p_days: days });
  if (error) throw new Error(mapSupabaseError(error, "Failed to load topic evidence"));
  return ((data || []) as Record<string, unknown>[]).map(mapTopicEvidence);
}

export async function getMyUnderstandingEvolved(): Promise<UnderstandingEvolved[]> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.rpc("get_my_understanding_evolved");
  if (error) throw new Error(mapSupabaseError(error, "Failed to load understanding updates"));
  return ((data || []) as Record<string, unknown>[]).map(mapUnderstandingEvolved);
}

function mapOpenInquiry(row: Record<string, unknown>): MyOpenInquiry {
  return {
    id: String(row.id ?? ""),
    roomId: String(row.room_id ?? ""),
    roomTitle: String(row.room_title ?? ""),
    roomSlug: String(row.room_slug ?? ""),
    content: String(row.content ?? ""),
    inquiryType: String(row.inquiry_type ?? ""),
    status: String(row.status ?? ""),
    targetClaimContent: row.target_claim_content ? String(row.target_claim_content) : null,
    responseCount: Number(row.response_count ?? 0),
    createdAt: String(row.created_at ?? ""),
  };
}

function mapInquiryResponseRow(row: Record<string, unknown>): InquiryResponse {
  return {
    inquiryId: String(row.inquiry_id ?? ""),
    inquiryContent: String(row.inquiry_content ?? ""),
    inquiryType: String(row.inquiry_type ?? ""),
    roomId: String(row.room_id ?? ""),
    roomTitle: String(row.room_title ?? ""),
    roomSlug: String(row.room_slug ?? ""),
    latestResponseContent: row.latest_response_content ? String(row.latest_response_content) : null,
    latestResponseUsername: row.latest_response_username ? String(row.latest_response_username) : null,
    responseCount: Number(row.response_count ?? 0),
    updatedAt: String(row.updated_at ?? ""),
  };
}

function mapDebateAttention(row: Record<string, unknown>): DebateAttention {
  return {
    roomId: String(row.room_id ?? ""),
    title: String(row.title ?? ""),
    slug: String(row.slug ?? ""),
    propositionTitle: String(row.proposition_title ?? ""),
    oppositionTitle: String(row.opposition_title ?? ""),
    status: String(row.status ?? ""),
    mySide: String(row.my_side ?? ""),
    myClaimCount: Number(row.my_claim_count ?? 0),
    opposingClaimCount: Number(row.opposing_claim_count ?? 0),
    lastActivityAt: row.last_activity_at ? String(row.last_activity_at) : null,
  };
}

function mapTopicEvidence(row: Record<string, unknown>): TopicEvidence {
  return {
    topicId: String(row.topic_id ?? ""),
    topicName: String(row.topic_name ?? ""),
    evidenceCount: Number(row.evidence_count ?? 0),
    rooms: ((row.rooms as Record<string, unknown>[]) || []).map((r) => ({
      roomId: String(r.room_id ?? ""),
      roomTitle: String(r.room_title ?? ""),
      roomSlug: String(r.room_slug ?? ""),
    })),
  };
}

function mapUnderstandingEvolved(row: Record<string, unknown>): UnderstandingEvolved {
  return {
    claimId: String(row.claim_id ?? ""),
    claimContent: String(row.claim_content ?? ""),
    roomId: String(row.room_id ?? ""),
    roomTitle: String(row.room_title ?? ""),
    roomSlug: String(row.room_slug ?? ""),
    myVote: String(row.my_vote ?? ""),
    agreeCount: Number(row.agree_count ?? 0),
    disagreeCount: Number(row.disagree_count ?? 0),
    consensusRatio: row.consensus_ratio !== null && row.consensus_ratio !== undefined ? Number(row.consensus_ratio) : null,
    evidenceCount: Number(row.evidence_count ?? 0),
    latestEvidence: row.latest_evidence ? String(row.latest_evidence) : null,
  };
}
