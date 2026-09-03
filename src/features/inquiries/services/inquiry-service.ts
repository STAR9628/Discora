import type { SupabaseClient } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/services/supabase/client";
import { mapSupabaseError } from "@/lib/errors";
import type { InquiryItem, InquiryResponse, InquiryType } from "../types";

export type MutationIdResult = { id: string };

interface DbInquiryItemRow {
  id: string;
  room_id: string;
  created_by: string;
  inquirer_side: string | null;
  inquiry_type: string;
  content: string;
  target_claim_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface DbInquiryItemViewRow extends DbInquiryItemRow {
  username: string | null;
  avatar_url: string | null;
  response_count: number;
}

interface DbInquiryResponseRow {
  id: string;
  inquiry_item_id: string;
  created_by: string;
  content: string;
  created_at: string;
}

interface DbInquiryResponseViewRow extends DbInquiryResponseRow {
  username: string | null;
  avatar_url: string | null;
}

function getClient(overrideClient?: SupabaseClient): SupabaseClient {
  return overrideClient || createBrowserSupabaseClient();
}

async function fetchProfilesByIds(userIds: string[], supabase: SupabaseClient): Promise<Map<string, { username: string | null; avatar_url: string | null }>> {
  if (userIds.length === 0) return new Map();
  const { data } = await supabase.from("profiles").select("id, username, avatar_url").in("id", userIds);
  const map = new Map<string, { username: string | null; avatar_url: string | null }>();
  for (const row of data || []) {
    map.set(row.id, { username: row.username, avatar_url: row.avatar_url });
  }
  return map;
}

function mapInquiryItemRow(row: DbInquiryItemViewRow): InquiryItem {
  return {
    id: row.id,
    roomId: row.room_id,
    createdBy: row.created_by,
    inquirerSide: row.inquirer_side,
    inquiryType: row.inquiry_type as InquiryType,
    content: row.content,
    targetClaimId: row.target_claim_id,
    status: row.status as InquiryItem["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    username: row.username,
    avatarUrl: row.avatar_url,
    responseCount: row.response_count,
  };
}

function mapInquiryResponseRow(row: DbInquiryResponseViewRow): InquiryResponse {
  return {
    id: row.id,
    inquiryItemId: row.inquiry_item_id,
    createdBy: row.created_by,
    content: row.content,
    createdAt: row.created_at,
    username: row.username,
    avatarUrl: row.avatar_url,
  };
}

export async function createInquiry(
  data: {
    roomId: string;
    targetClaimId: string;
    inquiryType: InquiryType;
    content: string;
  },
  overrideClient?: SupabaseClient,
): Promise<MutationIdResult> {
  const supabase = getClient(overrideClient);

  const { data: result, error } = await supabase.rpc("create_inquiry", {
    p_room_id: data.roomId,
    p_target_claim_id: data.targetClaimId,
    p_inquiry_type: data.inquiryType,
    p_content: data.content,
  });

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to create inquiry"));
  }

  return { id: result as unknown as string };
}

export async function respondToInquiry(
  data: {
    inquiryItemId: string;
    content: string;
  },
  overrideClient?: SupabaseClient,
): Promise<MutationIdResult> {
  const supabase = getClient(overrideClient);

  const { data: result, error } = await supabase.rpc("respond_to_inquiry", {
    p_inquiry_item_id: data.inquiryItemId,
    p_content: data.content,
  });

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to respond to inquiry"));
  }

  return { id: result as unknown as string };
}

export async function satisfyInquiry(
  inquiryItemId: string,
  overrideClient?: SupabaseClient,
): Promise<void> {
  const supabase = getClient(overrideClient);

  const { error } = await supabase.rpc("satisfy_inquiry", {
    p_inquiry_item_id: inquiryItemId,
  });

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to satisfy inquiry"));
  }
}

export async function unsatisfyInquiry(
  inquiryItemId: string,
  overrideClient?: SupabaseClient,
): Promise<void> {
  const supabase = getClient(overrideClient);

  const { error } = await supabase.rpc("unsatisfy_inquiry", {
    p_inquiry_item_id: inquiryItemId,
  });

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to unsatisfy inquiry"));
  }
}

export async function closeInquiry(
  inquiryItemId: string,
  overrideClient?: SupabaseClient,
): Promise<void> {
  const supabase = getClient(overrideClient);

  const { error } = await supabase.rpc("close_inquiry", {
    p_inquiry_item_id: inquiryItemId,
  });

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to close inquiry"));
  }
}

export async function getInquiryById(
  inquiryId: string,
  overrideClient?: SupabaseClient,
): Promise<InquiryItem | null> {
  const supabase = getClient(overrideClient);

  const { data, error } = await supabase
    .from("inquiry_items")
    .select(`
      *,
      inquiry_responses (count)
    `)
    .eq("id", inquiryId)
    .maybeSingle();

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to load inquiry by ID"));
  }

  if (!data) return null;

  const row = data as unknown as (DbInquiryItemRow & { inquiry_responses: { count: number }[] });
  const profiles = await fetchProfilesByIds([row.created_by], supabase);

  return mapInquiryItemRow({
    id: row.id,
    room_id: row.room_id,
    created_by: row.created_by,
    inquirer_side: row.inquirer_side,
    inquiry_type: row.inquiry_type,
    content: row.content,
    target_claim_id: row.target_claim_id,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    username: profiles.get(row.created_by)?.username || null,
    avatar_url: profiles.get(row.created_by)?.avatar_url || null,
    response_count: row.inquiry_responses?.[0]?.count || 0,
  });
}

export async function getInquiriesForTarget(
  targetClaimId: string,
  overrideClient?: SupabaseClient,
): Promise<InquiryItem[]> {
  const supabase = getClient(overrideClient);

  const { data, error } = await supabase
    .from("inquiry_items")
    .select(`
      *,
      inquiry_responses (count)
    `)
    .eq("target_claim_id", targetClaimId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to load inquiries"));
  }

  const rows = (data || []) as unknown as (DbInquiryItemRow & { inquiry_responses: { count: number }[] })[];

  const userIds = [...new Set(rows.map((r) => r.created_by))];
  const profiles = await fetchProfilesByIds(userIds, supabase);

  return rows.map((row) =>
    mapInquiryItemRow({
      id: row.id,
      room_id: row.room_id,
      created_by: row.created_by,
      inquirer_side: row.inquirer_side,
      inquiry_type: row.inquiry_type,
      content: row.content,
      target_claim_id: row.target_claim_id,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      username: profiles.get(row.created_by)?.username || null,
      avatar_url: profiles.get(row.created_by)?.avatar_url || null,
      response_count: row.inquiry_responses?.[0]?.count || 0,
    }),
  );
}

export async function getInquiryCountsByRoom(
  roomId: string,
  overrideClient?: SupabaseClient,
): Promise<Record<string, number>> {
  const supabase = getClient(overrideClient);

  const { data, error } = await supabase
    .from("inquiry_items")
    .select("target_claim_id")
    .eq("room_id", roomId);

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to load inquiry counts"));
  }

  const counts: Record<string, number> = {};
  for (const row of data || []) {
    counts[row.target_claim_id] = (counts[row.target_claim_id] || 0) + 1;
  }
  return counts;
}

export async function getInquiryResponses(
  inquiryItemId: string,
  overrideClient?: SupabaseClient,
): Promise<InquiryResponse[]> {
  const supabase = getClient(overrideClient);

  const { data, error } = await supabase
    .from("inquiry_responses")
    .select("*")
    .eq("inquiry_item_id", inquiryItemId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to load responses"));
  }

  const rows = (data || []) as DbInquiryResponseRow[];
  const userIds = [...new Set(rows.map((r) => r.created_by))];
  const profiles = await fetchProfilesByIds(userIds, supabase);

  return rows.map((row) =>
    mapInquiryResponseRow({
      id: row.id,
      inquiry_item_id: row.inquiry_item_id,
      created_by: row.created_by,
      content: row.content,
      created_at: row.created_at,
      username: profiles.get(row.created_by)?.username || null,
      avatar_url: profiles.get(row.created_by)?.avatar_url || null,
    }),
  );
}

export async function getInquiriesByRoom(
  roomId: string,
  overrideClient?: SupabaseClient,
): Promise<InquiryItem[]> {
  const supabase = getClient(overrideClient);

  const { data, error } = await supabase
    .from("inquiry_items")
    .select(`
      *,
      inquiry_responses (count)
    `)
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to load inquiries for room"));
  }

  const rows = (data || []) as unknown as (DbInquiryItemRow & { inquiry_responses: { count: number }[] })[];
  const userIds = [...new Set(rows.map((r) => r.created_by))];
  const profiles = await fetchProfilesByIds(userIds, supabase);

  return rows.map((row) =>
    mapInquiryItemRow({
      id: row.id,
      room_id: row.room_id,
      created_by: row.created_by,
      inquirer_side: row.inquirer_side,
      inquiry_type: row.inquiry_type,
      content: row.content,
      target_claim_id: row.target_claim_id,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      username: profiles.get(row.created_by)?.username || null,
      avatar_url: profiles.get(row.created_by)?.avatar_url || null,
      response_count: row.inquiry_responses?.[0]?.count || 0,
    }),
  );
}
