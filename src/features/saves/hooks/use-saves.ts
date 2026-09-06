import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { createBrowserSupabaseClient } from "@/services/supabase/client";
import { mapSupabaseError } from "@/lib/errors";
import { isTargetSaved, saveTarget, unsaveTarget, listSavedTargets } from "../services/save-service";
import type { SaveTargetType, SavedItem } from "../types";

async function hasRoomAccess(roomId: string): Promise<boolean> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.rpc("has_room_access", { p_room_id: roomId });
  if (error) return false;
  return !!data;
}

export function useIsSaved(targetType: SaveTargetType, targetId: string): boolean {
  const { user, status } = useAuth();
  const userId = user?.id;

  const { data } = useQuery({
    queryKey: ["saved", "status", userId, targetType, targetId],
    queryFn: () => isTargetSaved(userId!, targetType, targetId),
    enabled: status === "authenticated" && !!userId,
    staleTime: 30_000,
  });

  return !!data;
}

export function useToggleSave(targetType: SaveTargetType, targetId: string) {
  const queryClient = useQueryClient();
  const { user, status } = useAuth();
  const userId = user?.id;

  const isSavedQuery = useQuery({
    queryKey: ["saved", "status", userId, targetType, targetId],
    queryFn: () => isTargetSaved(userId!, targetType, targetId),
    enabled: status === "authenticated" && !!userId,
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not authenticated");
      if (isSavedQuery.data) {
        await unsaveTarget(userId, targetType, targetId);
      } else {
        await saveTarget(userId, targetType, targetId);
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["saved", "status", userId, targetType, targetId] });
      const previous = isSavedQuery.data;
      queryClient.setQueryData(["saved", "status", userId, targetType, targetId], !previous);
      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["saved", "status", userId, targetType, targetId], context.previous);
      }
      console.error("Save toggle failed:", err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["saved", "status", userId, targetType, targetId] });
      queryClient.invalidateQueries({ queryKey: ["saved", "list"] });
      queryClient.invalidateQueries({ queryKey: ["homepage", "recently-saved"] });
    },
  });

  return {
    isSaved: !!isSavedQuery.data,
    isLoading: isSavedQuery.isLoading || mutation.isPending,
    toggle: () => mutation.mutate(),
  };
}

export function useSavedList(options?: {
  targetType?: SaveTargetType;
  limit?: number;
  cursor?: string;
}) {
  const { user, status } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ["saved", "list", { userId, ...options }],
    queryFn: () => listSavedTargets(userId!, options),
    enabled: status === "authenticated" && !!userId,
    staleTime: 30_000,
  });
}

export function useRecentlySaved(limit = 5) {
  const { user, status } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ["homepage", "recently-saved", limit],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase
        .from("user_saves")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw new Error(mapSupabaseError(error, "Failed to load recently saved"));

      if (!data || data.length === 0) return [];

      const saveMap = new Map<string, (typeof data)[0]>();
      for (const save of data) {
        saveMap.set(`${save.target_type}:${save.target_id}`, save);
      }

      const items: SavedItem[] = [];
      const byType = new Map<string, typeof data>();
      for (const save of data) {
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
              if (room.visibility === "private" && !(await hasRoomAccess(room.id))) continue;
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
              if (room.visibility === "private" && !(await hasRoomAccess(claim.room_id))) continue;
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
                roomTitle: room.title,
                roomType: room.room_type as "discussion" | "debate",
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
              if (room.visibility === "private" && !(await hasRoomAccess(ev.room_id))) continue;
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
                roomTitle: room.title,
                roomType: room.room_type as "discussion" | "debate",
              });
            }
          }
        }
      }

      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return items.slice(0, limit);
    },
    enabled: status === "authenticated" && !!userId,
    staleTime: 30_000,
  });
}
