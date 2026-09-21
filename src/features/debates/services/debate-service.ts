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

export type DebateSortOption = "most_active" | "most_evidence" | "most_participants" | "newest" | "recently_updated";

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
    /** Optional intended participation deadline (ISO). Omitted = open-ended. */
    closesAt?: string | null;
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
      p_closes_at: data.closesAt ?? null,
    },
  );

  if (rpcError || !roomId) {
    throw new Error(mapSupabaseError(rpcError, "Failed to create debate room"));
  }

  const { data: { user: creator } } = await supabase.auth.getUser();

  if (creator) {
    // Plain insert (NOT upsert): migration 202606220001 replaced the plain
    // UNIQUE(room_id, user_id) with the partial unique index
    // idx_debate_participants_active_unique (... WHERE removed_at IS NULL),
    // which PostgREST column-list arbiters cannot infer (400). The partial
    // index still enforces at-most-one ACTIVE membership; a 23505 here only
    // means already joined (retry/double-submit) and is safe to absorb.
    const { error: joinError } = await supabase
      .from("debate_participants")
      .insert({
        room_id: roomId,
        user_id: creator.id,
        side: "proposition",
      });

    if (joinError && joinError.code !== "23505") {
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

  // Plain insert (NOT upsert): see creator auto-join above for why the
  // retired column-list arbiter cannot be used. The partial unique index
  // enforces single active membership; 23505 means already participating
  // (idempotent rejoin/race) and is absorbed. Side CHANGES never flow
  // through here — the UI routes those to switch_debate_side (definer RPC).
  const { error } = await supabase
    .from("debate_participants")
    .insert({
      room_id: roomId,
      user_id: user.id,
      side,
    });

  if (error) {
    if (error.code === "23505") return;
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
  statusFilter: "active" | "closing_soon" = "active",
  sort: DebateSortOption = "most_active",
  cursor?: string | null,
  pageSize: number = 20,
  overrideClient?: SupabaseClient,
): Promise<DebatePage> {
  const supabase = getClient(overrideClient);

  let query = supabase
    .from("discussion_debates")
    .select("*");

  // Approved Closing Soon window: 7 days. Qualification is evaluated by the
  // database against its own clock (timestamptz comparison); the client only
  // supplies the window bounds as values. NULL closes_at = open-ended debate,
  // which never qualifies. A passed deadline never changes status and never
  // removes the debate from Active — it simply stops qualifying here.
  const CLOSING_SOON_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

  if (statusFilter === "closing_soon") {
    const nowIso = new Date().toISOString();
    const soonIso = new Date(Date.now() + CLOSING_SOON_WINDOW_MS).toISOString();
    query = query
      .eq("status", "active")
      .not("closes_at", "is", null)
      .gt("closes_at", nowIso)
      .lte("closes_at", soonIso)
      // Temporal ordering (NOT popularity): nearest deadline first, with a
      // deterministic id tiebreak so keyset pagination cannot skip or repeat.
      .order("closes_at", { ascending: true })
      .order("id", { ascending: true });
  } else {
    query = query.eq("status", "active");

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
      case "recently_updated":
        // Meaningful room-level recency only: last_activity_at is derived from
        // creation events (room, non-retracted claims/evidence, participant
        // joins) — never from internal row updates, counts, or votes.
        query = query.order("last_activity_at", { ascending: false });
        break;
    }
  }

  if (cursor) {
    const parts = cursor.split("|");
    if (statusFilter === "closing_soon" && parts.length === 2) {
      const cursorSortValue = parts[0];
      const cursorId = parts[1];
      query = query.or(
        `closes_at.gt.${cursorSortValue},and(closes_at.eq.${cursorSortValue},id.gt.${cursorId})`,
      );
    } else if (parts.length === 3) {
      // Count sorts carry (count|tiebreak-timestamp|id). The tiebreak value
      // must be a timestamp: comparing last_activity_at against the count
      // string yields a 400 for zero-count ties and breaks Load More.
      // (newest/recently_updated never emit 3-part cursors.)
      const [countValue, activityValue] = parts;
      if (sort === "most_active") {
        query = query.or(`total_claims.lt.${countValue},and(total_claims.eq.${countValue},last_activity_at.lt.${activityValue})`);
      } else if (sort === "most_evidence") {
        query = query.or(`total_evidence.lt.${countValue},and(total_evidence.eq.${countValue},last_activity_at.lt.${activityValue})`);
      } else if (sort === "most_participants") {
        query = query.or(`total_participants.lt.${countValue},and(total_participants.eq.${countValue},last_activity_at.lt.${activityValue})`);
      }
    } else if (parts.length === 2) {
      const cursorSortValue = parts[0];
      if (sort === "newest") {
        query = query.lt("created_at", cursorSortValue);
      } else if (sort === "recently_updated") {
        query = query.lt("last_activity_at", cursorSortValue);
      } else if (
        sort === "most_active" ||
        sort === "most_evidence" ||
        sort === "most_participants"
      ) {
        // Legacy 2-part count cursor (pre-tiebreak format): cannot express the
        // timestamp tiebreak, so restart from the first page instead of
        // issuing a guaranteed-400 comparison. Cursors live only in
        // single-session React state, so no persistent state is affected.
      }
    }
  }

  query = query.limit(pageSize + 1);

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
    if (statusFilter === "closing_soon") {
      nextCursor = `${last.closes_at ?? ""}|${last.id}`;
    } else if (sort === "recently_updated") {
      nextCursor = `${last.last_activity_at ?? last.created_at}|${last.id}`;
    } else if (sort === "newest") {
      nextCursor = `${last.created_at}|${last.id}`;
    } else {
      // Count sorts: (count|tiebreak-timestamp|id) so the keyset predicate
      // compares timestamps against timestamps (see cursor handling above).
      const countValue =
        sort === "most_active"
          ? String(last.total_claims ?? 0)
          : sort === "most_evidence"
          ? String(last.total_evidence ?? 0)
          : String(last.total_participants ?? 0);
      nextCursor = `${countValue}|${last.last_activity_at ?? last.created_at}|${last.id}`;
    }
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
        status: row.status === "closed" ? "inactive" : "open",
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

export async function createPrivateDebate(
  data: {
    title: string;
    description?: string;
    topicId: string;
    propositionTitle: string;
    oppositionTitle: string;
    openingStatement: string;
    /** Optional intended participation deadline (ISO). Omitted = open-ended. */
    closesAt?: string | null;
  },
  overrideClient?: SupabaseClient,
): Promise<CreatedDebateResult> {
  const supabase = getClient(overrideClient);

  const { data: roomId, error: rpcError } = await supabase.rpc(
    "create_private_debate_room",
    {
      p_title: data.title,
      p_description: data.description || null,
      p_topic_id: data.topicId,
      p_proposition_title: data.propositionTitle,
      p_opposition_title: data.oppositionTitle,
      p_opening_statement: data.openingStatement || null,
      p_closes_at: data.closesAt ?? null,
    },
  );

  if (rpcError || !roomId) {
    throw new Error(mapSupabaseError(rpcError, "Failed to create private debate room"));
  }

  const { data: { user: creator } } = await supabase.auth.getUser();

  if (creator) {
    // Plain insert (NOT upsert): migration 202606220001 replaced the plain
    // UNIQUE(room_id, user_id) with the partial unique index
    // idx_debate_participants_active_unique (... WHERE removed_at IS NULL),
    // which PostgREST column-list arbiters cannot infer (400). The partial
    // index still enforces at-most-one ACTIVE membership; a 23505 here only
    // means already joined (retry/double-submit) and is safe to absorb.
    const { error: joinError } = await supabase
      .from("debate_participants")
      .insert({
        room_id: roomId,
        user_id: creator.id,
        side: "proposition",
      });

    if (joinError && joinError.code !== "23505") {
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

export async function createRoomInvitation(
  data: {
    roomId: string;
    invitedUserId?: string;
    invitedEmail?: string;
  },
  overrideClient?: SupabaseClient,
): Promise<{ invitationToken: string }> {
  const supabase = getClient(overrideClient);

  const { data: invitationToken, error: rpcError } = await supabase.rpc(
    "create_room_invitation",
    {
      p_room_id: data.roomId,
      p_invited_user_id: data.invitedUserId || null,
      p_invited_email: data.invitedEmail || null,
    },
  );

  if (rpcError || !invitationToken) {
    const message = (rpcError?.message ?? "").toLowerCase();
    if (message.includes("room_invite_cap")) {
      throw new Error("This room has reached its active invitation limit.");
    }
    if (message.includes("invitation_rate_limited")) {
      throw new Error("Too many invitations created. Please try again later.");
    }
    throw new Error(mapSupabaseError(rpcError, "Failed to create invitation"));
  }

  return { invitationToken };
}

export async function setRoomAccessCode(
  data: {
    roomId: string;
    code: string;
  },
  overrideClient?: SupabaseClient,
): Promise<void> {
  const supabase = getClient(overrideClient);

  const { error } = await supabase.rpc("set_room_access_code", {
    p_room_id: data.roomId,
    p_code: data.code,
  });

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to set access code"));
  }
}

export async function removeDebateParticipant(
  data: {
    roomId: string;
    userId: string;
  },
  overrideClient?: SupabaseClient,
): Promise<void> {
  const supabase = getClient(overrideClient);

  const { error } = await supabase.rpc("remove_participant", {
    p_room_id: data.roomId,
    p_user_id: data.userId,
  });

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to remove participant"));
  }
}

export async function publishDebateRoom(
  roomId: string,
  overrideClient?: SupabaseClient,
): Promise<void> {
  const supabase = getClient(overrideClient);

  const { error } = await supabase.rpc("make_room_public", {
    p_room_id: roomId,
  });

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to publish debate room"));
  }
}

/**
 * Update a debate's optional participation deadline.
 *
 * Authorization is enforced server-side by the existing RLS policy "Debate
 * creators can update debates" (room creator only). Non-creators and guests
 * receive an RLS denial, surfaced as an error. Clearing to NULL returns the
 * debate to open-ended. A passed deadline never changes status (no auto-close
 * exists anywhere); the debate simply stops qualifying for Closing Soon.
 */
export async function updateDebateDeadline(
  roomId: string,
  closesAt: string | null,
  overrideClient?: SupabaseClient,
): Promise<void> {
  const supabase = getClient(overrideClient);

  if (closesAt !== null) {
    const ts = new Date(closesAt).getTime();
    if (!Number.isFinite(ts)) {
      throw new Error("Please provide a valid deadline.");
    }
    if (ts <= Date.now()) {
      throw new Error("The deadline must be in the future. Clear it for an open-ended debate.");
    }
  }

  const { error } = await supabase
    .from("debates")
    .update({ closes_at: closesAt })
    .eq("id", roomId);

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to update debate deadline"));
  }
}

export async function acceptInvitation(
  data: {
    roomId: string;
    invitationToken: string;
  },
  overrideClient?: SupabaseClient,
): Promise<void> {
  const supabase = getClient(overrideClient);

  // Phase 9D.3: the hardened RPC returns the room id on success and NULL on ANY
  // failure (invalid/expired/revoked/wrong-room/wrong-identity/throttled). One
  // generic message keeps failure classes indistinguishable by design.
  const { data: acceptedRoomId, error } = await supabase.rpc("accept_invitation", {
    p_invitation_token: data.invitationToken,
    p_room_id: data.roomId,
  });

  if (error || !acceptedRoomId) {
    throw new Error("This invitation is not available.");
  }
}

export async function joinWithAccessCode(
  data: {
    roomId: string;
    code: string;
  },
  overrideClient?: SupabaseClient,
): Promise<void> {
  const supabase = getClient(overrideClient);

  const { data: result, error } = await supabase.rpc("join_with_access_code", {
    p_room_id: data.roomId,
    p_code: data.code,
  });

  if (error) {
    if (error.message?.includes("too_many_attempts") || error.message?.includes("rate_limit")) {
      throw new Error("Too many failed attempts. Please wait 15 minutes before trying again.");
    }
    throw new Error(mapSupabaseError(error, "Failed to join with access code"));
  }

  if (result === null) {
    throw new Error("Invalid access code.");
  }
}

export async function getRoomInvitations(
  roomId: string,
  overrideClient?: SupabaseClient,
): Promise<RoomInvitation[]> {
  const supabase = getClient(overrideClient);

  // Phase 9D.3: explicit lifecycle columns only. Token hashes are never
  // delivered to the UI; newly minted links come solely from the create call.
  const { data, error } = await supabase
    .from("room_invitations")
    .select(
      "id, room_id, invited_by, invited_user_id, email, status, accepted_at, revoked_at, created_at, updated_at, expires_at",
    )
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to load invitations"));
  }

  return (data || []).map((row: {
    id: string;
    room_id: string;
    invited_by: string;
    invited_user_id: string | null;
    email: string | null;
    status: string;
    accepted_at: string | null;
    revoked_at: string | null;
    created_at: string;
    updated_at: string;
    expires_at: string | null;
  }) => ({
    id: row.id,
    roomId: row.room_id,
    invitedBy: row.invited_by,
    invitedUserId: row.invited_user_id,
    email: row.email,
    status: row.status as "active" | "accepted" | "revoked" | "expired",
    acceptedAt: row.accepted_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
  }));
}

export async function revokeRoomInvitation(
  invitationId: string,
  overrideClient?: SupabaseClient,
): Promise<void> {
  const supabase = getClient(overrideClient);

  // Phase 9D.3: owner-only revoke RPC. Direct client UPDATE is no longer granted.
  const { error } = await supabase.rpc("revoke_room_invitation", {
    p_invitation_id: invitationId,
  });

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to revoke invitation"));
  }
}

export interface RoomInvitation {
  id: string;
  roomId: string;
  invitedBy: string;
  invitedUserId: string | null;
  email: string | null;
  status: "active" | "accepted" | "revoked" | "expired";
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
}

export async function roomHasAccessCode(
  roomId: string,
  overrideClient?: SupabaseClient,
): Promise<boolean> {
  const supabase = getClient(overrideClient);

  // Phase 9D.3: presence check only — the code hash is never returned.
  const { data, error } = await supabase.rpc("room_has_access_code", {
    p_room_id: roomId,
  });

  if (error) return false;
  return !!data;
}

export async function setParticipantInvitesEnabled(
  data: {
    roomId: string;
    enabled: boolean;
  },
  overrideClient?: SupabaseClient,
): Promise<void> {
  const supabase = getClient(overrideClient);

  const { error } = await supabase.rpc("set_participant_invites_enabled", {
    p_room_id: data.roomId,
    p_enabled: data.enabled,
  });

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to update participant invites setting"));
  }
}
