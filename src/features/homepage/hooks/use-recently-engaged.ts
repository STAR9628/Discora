import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { createBrowserSupabaseClient } from "@/services/supabase/client";
import { mapSupabaseError } from "@/lib/errors";

export interface RecentEngagement {
  roomId: string;
  roomTitle: string;
  roomSlug: string;
  roomType: string;
  engagementType: string;
  engagementDetail: string;
  lastEngagedAt: string;
}

export function useRecentlyEngaged(limit = 5) {
  const { user, status } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ["homepage", "recently-engaged", limit],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase.rpc("get_my_recent_engagement", { p_limit: limit });

      if (error) {
        throw new Error(mapSupabaseError(error, "Failed to load recent engagement"));
      }

      return ((data || []) as Record<string, unknown>[]).map(mapRecentEngagement);
    },
    enabled: status === "authenticated" && !!userId,
    staleTime: 30_000,
  });
}

function mapRecentEngagement(row: Record<string, unknown>): RecentEngagement {
  return {
    roomId: String(row.room_id ?? ""),
    roomTitle: String(row.room_title ?? ""),
    roomSlug: String(row.room_slug ?? ""),
    roomType: String(row.room_type ?? "discussion"),
    engagementType: String(row.engagement_type ?? ""),
    engagementDetail: String(row.engagement_detail ?? ""),
    lastEngagedAt: String(row.last_engaged_at ?? ""),
  };
}
