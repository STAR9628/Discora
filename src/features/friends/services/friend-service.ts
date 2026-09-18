import type { SupabaseClient } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/services/supabase/client";

/**
 * Phase 9D.2B — Friend service (Beta).
 *
 * Security model (enforced by the database, never by UI visibility):
 * - Reads: owner-scoped RLS SELECT on friend_requests / friend_relationships /
 *   user_blocks. The client can only ever see rows it sent, received, or created.
 * - Mutations: approved lifecycle RPCs ONLY (create/accept/decline/revoke,
 *   block_user/unblock_user). No client-side INSERT/UPDATE/DELETE exists.
 * - Friend graph stays private: only display name + public avatar of a
 *   relationship counterpart are ever rendered.
 */

export type RelationshipState =
  | "self"
  | "not_connected"
  | "request_sent"
  | "request_received"
  | "friends"
  | "blocked_by_me";

export interface FriendRequestRow {
  id: string;
  senderUserId: string;
  recipientUserId: string;
  status: string;
  createdAt: string;
}

export interface FriendshipRow {
  userAId: string;
  userBId: string;
}

export interface CounterpartProfile {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface IncomingRequest extends FriendRequestRow {
  sender: CounterpartProfile | null;
}

export interface OutgoingRequest extends FriendRequestRow {
  recipient: CounterpartProfile | null;
}

export interface FriendEntry {
  friendUserId: string;
  profile: CounterpartProfile | null;
}

export interface BlockedEntry {
  blockedUserId: string;
  profile: CounterpartProfile | null;
}

function getClient(): SupabaseClient {
  return createBrowserSupabaseClient();
}

function mapRow(row: {
  id: string;
  sender_user_id: string;
  recipient_user_id: string;
  status: string;
  created_at: string;
}): FriendRequestRow {
  return {
    id: row.id,
    senderUserId: row.sender_user_id,
    recipientUserId: row.recipient_user_id,
    status: row.status,
    createdAt: row.created_at,
  };
}

/**
 * Map a database RPC failure to neutral, human-readable language.
 * Internal error codes are never exposed to the user.
 */
export function mapFriendError(error: { message?: string } | null): string {
  const message = (error?.message ?? "").toLowerCase();
  if (message.includes("inbox_cap_reached")) {
    return "This member has reached their pending friend request limit.";
  }
  if (message.includes("rate_limit_exceeded")) {
    return "Too many requests. Please try again later.";
  }
  if (message.includes("friend_request_cooldown")) {
    return "Please wait before sending another request to this member.";
  }
  if (message.includes("friend_request_pending")) {
    return "A request is already pending with this member.";
  }
  if (message.includes("already_friends")) {
    return "You are already friends with this member.";
  }
  if (message.includes("self_request") || message.includes("self_block")) {
    return "This action is not available.";
  }
  if (message.includes("blocked")) {
    return "Friend requests are not possible with this member.";
  }
  if (message.includes("recipient_inactive") || message.includes("forbidden_account_inactive")) {
    return "This member is not available.";
  }
  if (
    message.includes("invalid_request") ||
    message.includes("friend_request_expired") ||
    message.includes("not-found") ||
    message.includes("no rows")
  ) {
    return "This request is no longer available.";
  }
  if (message.includes("not_authenticated") || message.includes("jwt")) {
    return "Please sign in and try again.";
  }
  return "Something went wrong. Please try again.";
}

async function hydrateCounterparts(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, CounterpartProfile>> {
  const map = new Map<string, CounterpartProfile>();
  const unique = [...new Set(userIds)].filter(Boolean);
  if (unique.length === 0) return map;
  // Approved invitation profile visibility: display name + public avatar only.
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", unique);
  if (error || !data) return map;
  for (const row of data as {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  }[]) {
    map.set(row.id, {
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
    });
  }
  return map;
}

export async function listIncomingRequests(userId: string): Promise<IncomingRequest[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("friend_requests")
    .select("id, sender_user_id, recipient_user_id, status, created_at")
    .eq("recipient_user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Failed to load incoming requests.");
  const rows = (data ?? []).map(mapRow);
  const profiles = await hydrateCounterparts(
    supabase,
    rows.map((r) => r.senderUserId),
  );
  return rows.map((r) => ({ ...r, sender: profiles.get(r.senderUserId) ?? null }));
}

export async function listOutgoingRequests(userId: string): Promise<OutgoingRequest[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("friend_requests")
    .select("id, sender_user_id, recipient_user_id, status, created_at")
    .eq("sender_user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Failed to load sent requests.");
  const rows = (data ?? []).map(mapRow);
  const profiles = await hydrateCounterparts(
    supabase,
    rows.map((r) => r.recipientUserId),
  );
  return rows.map((r) => ({ ...r, recipient: profiles.get(r.recipientUserId) ?? null }));
}

export async function listFriendships(userId: string): Promise<FriendEntry[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("friend_relationships")
    .select("user_a_id, user_b_id")
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);
  if (error) throw new Error("Failed to load friends.");
  const entries = ((data ?? []) as { user_a_id: string; user_b_id: string }[]).map(
    (row) => (row.user_a_id === userId ? row.user_b_id : row.user_a_id),
  );
  const profiles = await hydrateCounterparts(supabase, entries);
  return entries.map((friendUserId) => ({
    friendUserId,
    profile: profiles.get(friendUserId) ?? null,
  }));
}

export async function listBlockedUsers(userId: string): Promise<BlockedEntry[]> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("user_blocks")
    .select("blocked_user_id")
    .eq("blocker_user_id", userId);
  if (error) throw new Error("Failed to load blocked members.");
  const ids = ((data ?? []) as { blocked_user_id: string }[]).map((r) => r.blocked_user_id);
  const profiles = await hydrateCounterparts(supabase, ids);
  return ids.map((blockedUserId) => ({
    blockedUserId,
    profile: profiles.get(blockedUserId) ?? null,
  }));
}

/**
 * Compute the viewer's relationship to a target user from owner-visible rows only.
 * A block BY the target is invisible to the viewer (block rows are blocker-scoped),
 * so that case correctly resolves to "not_connected" and the RPC rejects sends
 * with a neutral message.
 */
export async function getRelationshipState(
  viewerUserId: string,
  targetUserId: string,
): Promise<RelationshipState> {
  if (viewerUserId === targetUserId) return "self";
  const supabase = getClient();

  const { data: blockRows } = await supabase
    .from("user_blocks")
    .select("blocked_user_id")
    .eq("blocker_user_id", viewerUserId)
    .eq("blocked_user_id", targetUserId)
    .limit(1);
  if (blockRows && blockRows.length > 0) return "blocked_by_me";

  const { data: friendships } = await supabase
    .from("friend_relationships")
    .select("user_a_id")
    .or(
      `and(user_a_id.eq.${viewerUserId},user_b_id.eq.${targetUserId}),and(user_a_id.eq.${targetUserId},user_b_id.eq.${viewerUserId})`,
    )
    .limit(1);
  if (friendships && friendships.length > 0) return "friends";

  const { data: pending } = await supabase
    .from("friend_requests")
    .select("sender_user_id, recipient_user_id")
    .eq("status", "pending")
    .or(
      `and(sender_user_id.eq.${viewerUserId},recipient_user_id.eq.${targetUserId}),and(sender_user_id.eq.${targetUserId},recipient_user_id.eq.${viewerUserId})`,
    )
    .limit(1);
  if (pending && pending.length > 0) {
    const row = pending[0] as { sender_user_id: string; recipient_user_id: string };
    return row.sender_user_id === viewerUserId ? "request_sent" : "request_received";
  }

  return "not_connected";
}

/**
 * The single pending request between viewer and target in either direction,
 * or null. Used to wire Accept / Decline / Withdraw to the right request id.
 */
export async function getPendingBetween(
  viewerUserId: string,
  targetUserId: string,
): Promise<FriendRequestRow | null> {
  const supabase = getClient();
  const { data, error } = await supabase
    .from("friend_requests")
    .select("id, sender_user_id, recipient_user_id, status, created_at")
    .eq("status", "pending")
    .or(
      `and(sender_user_id.eq.${viewerUserId},recipient_user_id.eq.${targetUserId}),and(sender_user_id.eq.${targetUserId},recipient_user_id.eq.${viewerUserId})`,
    )
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return mapRow(data);
}

async function callRpc(fn: string, args: Record<string, string>): Promise<string | null> {
  const supabase = getClient();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(mapFriendError(error));
  return (data as string | null) ?? null;
}

export function sendFriendRequest(recipientUserId: string): Promise<string | null> {
  return callRpc("create_friend_request", { p_recipient_user_id: recipientUserId });
}

export function acceptFriendRequest(requestId: string): Promise<string | null> {
  return callRpc("accept_friend_request", { p_request_id: requestId });
}

export function declineFriendRequest(requestId: string): Promise<string | null> {
  return callRpc("decline_friend_request", { p_request_id: requestId });
}

export function cancelFriendRequest(requestId: string): Promise<string | null> {
  return callRpc("revoke_friend_request", { p_request_id: requestId });
}

export async function blockMember(targetUserId: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase.rpc("block_user", { p_target_user_id: targetUserId });
  if (error) throw new Error(mapFriendError(error));
}

export async function unblockMember(targetUserId: string): Promise<void> {
  const supabase = getClient();
  const { error } = await supabase.rpc("unblock_user", { p_target_user_id: targetUserId });
  if (error) throw new Error(mapFriendError(error));
}
