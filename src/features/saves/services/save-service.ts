import type { SupabaseClient } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/services/supabase/client";
import { mapSupabaseError } from "@/lib/errors";
import type { SaveTargetType, UserSave, SavedItem } from "../types";

function getClient(overrideClient?: SupabaseClient): SupabaseClient {
  return overrideClient || createBrowserSupabaseClient();
}

async function hasRoomAccess(roomId: string, supabase: SupabaseClient): Promise<boolean> {
  const { data, error } = await supabase.rpc("has_room_access", { p_room_id: roomId });
  if (error) return false;
  return !!data;
}

export async function isTargetSaved(
  userId: string,
  targetType: SaveTargetType,
  targetId: string,
  overrideClient?: SupabaseClient,
): Promise<boolean> {
  const supabase = getClient(overrideClient);
  const { data, error } = await supabase
    .from("user_saves")
    .select("id")
    .eq("user_id", userId)
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .maybeSingle();

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to check save status"));
  }

  return !!data;
}

export async function saveTarget(
  userId: string,
  targetType: SaveTargetType,
  targetId: string,
  overrideClient?: SupabaseClient,
): Promise<void> {
  const supabase = getClient(overrideClient);

  const { error } = await supabase.rpc("save_target_secure", {
    p_target_type: targetType,
    p_target_id: targetId,
  });

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to save item"));
  }
}

export async function unsaveTarget(
  userId: string,
  targetType: SaveTargetType,
  targetId: string,
  overrideClient?: SupabaseClient,
): Promise<void> {
  const supabase = getClient(overrideClient);
  const { error } = await supabase
    .from("user_saves")
    .delete()
    .eq("user_id", userId)
    .eq("target_type", targetType)
    .eq("target_id", targetId);

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to remove save"));
  }
}

export async function listSavedTargets(
  userId: string,
  options?: {
    targetType?: SaveTargetType;
    limit?: number;
    cursor?: string;
  },
  overrideClient?: SupabaseClient,
): Promise<{ items: SavedItem[]; nextCursor: string | null }> {
  const supabase = getClient(overrideClient);
  const limit = options?.limit ?? 20;

  let query = supabase
    .from("user_saves")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options?.targetType) {
    query = query.eq("target_type", options.targetType);
  }

  if (options?.cursor) {
    query = query.lt("created_at", options.cursor);
  }

  const { data: saves, error } = await query;

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to load saved items"));
  }

  if (!saves || saves.length === 0) {
    return { items: [], nextCursor: null };
  }

  const saveMap = new Map<string, UserSave>();
  for (const save of saves) {
    saveMap.set(`${save.target_type}:${save.target_id}`, save);
  }

  const items: SavedItem[] = [];
  const byType = new Map<string, UserSave[]>();
  for (const save of saves) {
    const key = save.target_type;
    if (!byType.has(key)) byType.set(key, []);
    byType.get(key)!.push(save);
  }

  for (const [type, typeSaves] of byType) {
    const ids = typeSaves.map((s) => s.target_id);

    if (type === "discussion" || type === "debate") {
      const { data: rooms } = await supabase
        .from("rooms")
        .select("id, title, slug, room_type, visibility, status")
        .in("id", ids);

      if (rooms) {
        const roomMap = new Map(rooms.map((r) => [r.id, r]));
        for (const save of typeSaves) {
          const room = roomMap.get(save.target_id);
          if (!room) continue;
          if (room.status === "archived") continue;
          if (room.visibility === "private" && !(await hasRoomAccess(room.id, supabase))) continue;
          items.push({
            id: save.id,
            targetType: save.target_type,
            targetId: save.target_id,
            createdAt: save.created_at,
            title: room.title,
            slug: room.slug,
            roomType: room.room_type as "discussion" | "debate",
            roomTitle: room.title,
          });
        }
      }
    } else if (type === "claim") {
      const { data: claims } = await supabase
        .from("discussion_claims")
        .select("id, room_id, content, is_retracted")
        .in("id", ids);

      if (claims) {
        const roomIds = [...new Set(claims.map((c) => c.room_id))];
        const { data: rooms } = await supabase
          .from("rooms")
          .select("id, title, slug, room_type, visibility, status")
          .in("id", roomIds);

        const roomMap = new Map((rooms ?? []).map((r) => [r.id, r]));
        for (const claim of claims) {
          const room = roomMap.get(claim.room_id);
          if (!room) continue;
          if (room.status === "archived") continue;
          if (room.visibility === "private" && !(await hasRoomAccess(claim.room_id, supabase))) continue;
          if (claim.is_retracted) continue;
          const save = saveMap.get(`${type}:${claim.id}`);
          if (!save) continue;
          items.push({
            id: save.id,
            targetType: save.target_type,
            targetId: save.target_id,
            createdAt: save.created_at,
            title: claim.content,
            slug: room.slug,
            roomType: room.room_type as "discussion" | "debate",
            roomTitle: room.title,
          });
        }
      }
    } else if (type === "evidence") {
      const { data: evidence } = await supabase
        .from("discussion_evidence")
        .select("id, room_id, content, is_retracted")
        .in("id", ids);

      if (evidence) {
        const roomIds = [...new Set(evidence.map((e) => e.room_id))];
        const { data: rooms } = await supabase
          .from("rooms")
          .select("id, title, slug, room_type, visibility, status")
          .in("id", roomIds);

        const roomMap = new Map((rooms ?? []).map((r) => [r.id, r]));
        for (const ev of evidence) {
          const room = roomMap.get(ev.room_id);
          if (!room) continue;
          if (room.status === "archived") continue;
          if (room.visibility === "private" && !(await hasRoomAccess(ev.room_id, supabase))) continue;
          if (ev.is_retracted) continue;
          const save = saveMap.get(`${type}:${ev.id}`);
          if (!save) continue;
          items.push({
            id: save.id,
            targetType: save.target_type,
            targetId: save.target_id,
            createdAt: save.created_at,
            title: ev.content,
            slug: room.slug,
            roomType: room.room_type as "discussion" | "debate",
            roomTitle: room.title,
          });
        }
      }
    }
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const nextCursor = saves.length === limit ? saves[saves.length - 1].created_at : null;

  return { items, nextCursor };
}
