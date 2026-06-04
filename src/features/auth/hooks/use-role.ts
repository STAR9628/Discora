"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import { createBrowserSupabaseClient } from "@/services/supabase/client";

export function useHasRole(requiredRole: "moderator" | "admin") {
  const { user, status } = useAuth();
  
  return useQuery({
    queryKey: ["user-role", user?.id, requiredRole],
    queryFn: async () => {
      if (!user?.id) return false;
      const supabase = createBrowserSupabaseClient();
      const { data, error } = await supabase.rpc("has_current_user_role_or_higher", {
        p_required_role: requiredRole,
      });
      if (error) {
        console.error("Error checking role:", error);
        return false;
      }
      return !!data;
    },
    enabled: status === "authenticated" && !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
