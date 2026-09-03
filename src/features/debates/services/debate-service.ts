import type { SupabaseClient } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/services/supabase/client";
import { mapSupabaseError } from "@/lib/errors";
import type { Room, Debate, DebateParticipant, DebateSideChange, DiscussionClaim } from "@/features/discussions/types";
import type { Topic } from "@/types/domain";
import { mapRoomRow, mapDebateRow, mapDiscussionClaimRow, mapTopicRow } from "@/features/discussions/services/discussion-service";
import type { DbRoomRow, DbDebateRow, DbTopicRow } from "@/features/discussions/services/discussion-service";

function getClient(overrideClient?: SupabaseClient): SupabaseClient {
  return overrideClient || createBrowserSupabaseClient();
}

export interface CreatedDebateResult {
  room: Room;
  debate: Debate;
}

export interface DebateFeedItem {
  room: Room;
  debate: Debate;
}

export interface DebateRoomData {
  room: Room;
  topic: Topic | null;
  debate: Debate;
}

export type DebateSortOption = "most_active" | "most_evidence" | "most_participants" | "newest";

export interface DebatePage {
  items: DebateFeedItem[];
  nextCursor: string | null;
}

export async function getDebateBySlug(
  slug: string,
  overrideClient?: SupabaseClient,
): Promise<DebateRoomData | null> {
  const supabase = getClient(overrideClient);

  const { data, error } = await supabase
    .from("rooms")
    .select(`
      *,
      topics!left (*),
      debates!left (*)
    `)
    .eq("slug", slug)
    .eq("room_type", "debate")
    .maybeSingle();

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to load debate"));
  }

  if (!data) return null;

  const joinedRow = data as unknown as DbRoomRow & { topics: DbTopicRow | null; debates: DbDebateRow | null };

  if (!joinedRow.debates) return null;

  return {
    room: mapRoomRow(joinedRow),
    topic: joinedRow.topics ? mapTopicRow(joinedRow.topics) : null,
    debate: mapDebateRow(joinedRow.debates),
  };
}

export async function createDebate(
  data: {
    title: string;
    description?: string;
    topicId: string;
    openingStatement: string;
  },
  overrideClient?: SupabaseClient,
): Promise<CreatedDebateResult> {
  const supabase = getClient(overrideClient);

  const { data: roomId, error: rpcError } = await supabase.rpc(
    "create_debate_room",
    {
      p_title: data.title,
      p_description: data.description || null,
      p_topic_id: data.topicId,
      p_proposition_title: 'Supports the motion',
      p_opposition_title: 'Opposes the motion',
      p_opening_statement: data.openingStatement || null,
    },
  );

  if (rpcError || !roomId) {
    throw new Error(mapSupabaseError(rpcError, "Failed to create debate room"));
  }

  const { data: { user: creator } } = await supabase.auth.getUser();

  if (creator) {
    const { error: joinError } = await supabase
      .from("debate_participants")
      .upsert({
        room_id: roomId,
        user_id: creator.id,
        side: "proposition",
      }, {
        onConflict: "room_id,user_id",
      });

    if (joinError) {
      console.warn("Failed to auto-join creator to proposition:", joinError.message);
    }
  }

  const { data: roomResult, error: readError } = await supabase
    .from("rooms")
    .select(`
      *,
      debates!left (*)
    `)
    .eq("id", roomId)
    .single();

  if (readError || !roomResult) {
    throw new Error(mapSupabaseError(readError, "Failed to retrieve the created debate details"));
  }

  const joinedRow = roomResult as unknown as DbRoomRow & { debates: DbDebateRow | null };

  return {
    room: mapRoomRow(joinedRow),
    debate: joinedRow.debates ? mapDebateRow(joinedRow.debates) : null as unknown as Debate,
  };
}

export async function getDebateByRoomId(
  roomId: string,
  overrideClient?: SupabaseClient,
): Promise<Debate | null> {
  const supabase = getClient(overrideClient);

  const { data, error } = await supabase
    .from("discussion_debates")
    .select("*")
    .eq("id", roomId)
    .maybeSingle();

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to load debate"));
  }

  return data ? mapDebateRow(data as unknown as DbDebateRow) : null;
}

export async function joinDebate(
  roomId: string,
  side: "proposition" | "opposition" | "neutral",
  overrideClient?: SupabaseClient,
): Promise<void> {
  const supabase = getClient(overrideClient);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Must be authenticated to join a debate.");
  }

  const { error } = await supabase
    .from("debate_participants")
    .upsert({
      room_id: roomId,
      user_id: user.id,
      side,
    }, {
      onConflict: "room_id,user_id",
    });

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to join debate"));
  }
}

export async function leaveDebate(
  roomId: string,
  overrideClient?: SupabaseClient,
): Promise<void> {
  const supabase = getClient(overrideClient);

  const { error } = await supabase
    .from("debate_participants")
    .delete()
    .eq("room_id", roomId);

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to leave debate"));
  }
}

export async function getDebateParticipants(
  roomId: string,
  overrideClient?: SupabaseClient,
): Promise<DebateParticipant[]> {
  const supabase = getClient(overrideClient);

  const { data, error } = await supabase
    .from("debate_participants")
    .select("*")
    .eq("room_id", roomId);

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to load debate participants"));
  }

  return (data || []).map((row: { id: string; room_id: string; user_id: string; side: "proposition" | "opposition" | "neutral"; joined_at: string }) => ({
    id: row.id,
    roomId: row.room_id,
    userId: row.user_id,
    side: row.side,
    joinedAt: row.joined_at,
  }));
}

export async function getClaimsBySide(
  roomId: string,
  side: "proposition" | "opposition",
  overrideClient?: SupabaseClient,
): Promise<DiscussionClaim[]> {
  const supabase = getClient(overrideClient);

  const { data, error } = await supabase
    .from("discussion_claims")
    .select("*")
    .eq("room_id", roomId)
    .eq("debate_side", side)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to load debate claims"));
  }

  return (data || []).map(mapDiscussionClaimRow);
}

export async function getDebates(
  statusFilter: "active" | "resolved" | "closing_soon" = "active",
  sort: DebateSortOption = "most_active",
  cursor?: string | null,
  pageSize: number = 20,
  overrideClient?: SupabaseClient,
): Promise<DebatePage> {
  const supabase = getClient(overrideClient);

  let query = supabase
    .from("discussion_debates")
    .select("*");

  if (statusFilter === "active") {
    query = query.eq("status", "active");
  } else if (statusFilter === "resolved") {
    query = query.eq("status", "resolved");
  } else if (statusFilter === "closing_soon") {
    query = query.eq("status", "active");
  }

  switch (sort) {
    case "most_active":
      query = query.order("total_claims", { ascending: false });
      query = query.order("last_activity_at", { ascending: false });
      break;
    case "most_evidence":
      query = query.order("total_evidence", { ascending: false });
      query = query.order("last_activity_at", { ascending: false });
      break;
    case "most_participants":
      query = query.order("total_participants", { ascending: false });
      query = query.order("last_activity_at", { ascending: false });
      break;
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
  }

  if (cursor) {
    const parts = cursor.split("|");
    if (parts.length === 2) {
      const cursorSortValue = parts[0];
      if (sort === "newest") {
        query = query.lt("created_at", cursorSortValue);
      } else if (sort === "most_active") {
        query = query.or(`total_claims.lt.${cursorSortValue},and(total_claims.eq.${cursorSortValue},last_activity_at.lt.${cursorSortValue})`);
      } else if (sort === "most_evidence") {
        query = query.or(`total_evidence.lt.${cursorSortValue},and(total_evidence.eq.${cursorSortValue},last_activity_at.lt.${cursorSortValue})`);
      } else if (sort === "most_participants") {
        query = query.or(`total_participants.lt.${cursorSortValue},and(total_participants.eq.${cursorSortValue},last_activity_at.lt.${cursorSortValue})`);
      }
    }
  }

  query = query.limit(pageSize + 1);

  if (statusFilter === "closing_soon") {
    if (!cursor) {
      query = query.order("created_at", { ascending: true });
    }
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to load debates"));
  }

  const rows = (data || []) as unknown as DbDebateRow[];
  const hasMore = rows.length > pageSize;
  const items = rows.slice(0, pageSize);

  let nextCursor: string | null = null;
  if (hasMore && items.length > 0) {
    const last = items[items.length - 1];
    const sortValue = sort === "newest"
      ? last.created_at
      : sort === "most_active"
      ? String(last.total_claims ?? 0)
      : sort === "most_evidence"
      ? String(last.total_evidence ?? 0)
      : String(last.total_participants ?? 0);
    nextCursor = `${sortValue}|${last.id}`;
  }

  return {
    items: items.map((row) => {
      const debate = mapDebateRow(row);
      const room: Room = {
        id: row.id,
        title: row.title || "",
        slug: row.slug || "",
        description: row.description || undefined,
        roomType: "debate",
        visibility: (row.visibility as "public" | "private") || "public",
        status: row.status === "resolved" ? "inactive" : "open",
        createdBy: row.room_created_by || "",
        topicId: row.topic_id || undefined,
        createdAt: row.room_created_at || row.created_at,
        updatedAt: row.room_updated_at || row.updated_at,
      };
      return { room, debate };
    }),
    nextCursor,
  };
}

export async function switchDebateSide(
  roomId: string,
  newSide: "proposition" | "opposition",
  reason: string,
  overrideClient?: SupabaseClient,
): Promise<void> {
  const supabase = getClient(overrideClient);

  const trimmedReason = reason.trim();
  if (trimmedReason.length < 50) {
    throw new Error("Reason must be at least 50 characters.");
  }

  const { error } = await supabase.rpc("switch_debate_side", {
    p_room_id: roomId,
    p_new_side: newSide,
    p_reason: trimmedReason,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("not_authenticated")) throw new Error("You must be logged in to switch sides.");
    if (msg.includes("reason_too_short")) throw new Error("Reason must be at least 50 characters.");
    if (msg.includes("same_side")) throw new Error("You are already on this side.");
    if (msg.includes("neutral_switch")) throw new Error("Neutral observers cannot switch sides directly. Leave and rejoin.");
    if (msg.includes("not_participating")) throw new Error("You must join the debate before switching sides.");
    if (msg.includes("cooldown_active")) throw new Error("You can only switch sides once every 24 hours. Please wait before changing again.");
    throw new Error(mapSupabaseError(error, "Failed to switch sides"));
  }
}

export async function getSideChangeHistory(
  roomId: string,
  userId: string,
  overrideClient?: SupabaseClient,
): Promise<DebateSideChange[]> {
  const supabase = getClient(overrideClient);

  const { data, error } = await supabase
    .from("debate_side_changes")
    .select("*")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to load side change history"));
  }

  return (data || []).map((row: {
    id: string;
    room_id: string;
    user_id: string;
    previous_side: "proposition" | "opposition";
    new_side: "proposition" | "opposition";
    reason: string;
    created_at: string;
  }) => ({
    id: row.id,
    roomId: row.room_id,
    userId: row.user_id,
    previousSide: row.previous_side,
    newSide: row.new_side,
    reason: row.reason,
    createdAt: row.created_at,
  }));
}

export async function resolveDebate(
  roomId: string,
  resolution: {
    winner: "proposition" | "opposition" | "draw";
    summary: string;
    resolvedBy: string;
  },
  overrideClient?: SupabaseClient,
): Promise<void> {
  const supabase = getClient(overrideClient);

  const { error } = await supabase.rpc("resolve_debate", {
    p_room_id: roomId,
    p_winner: resolution.winner,
    p_summary: resolution.summary,
    p_resolved_by: resolution.resolvedBy,
  });

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to resolve debate"));
  }
}
