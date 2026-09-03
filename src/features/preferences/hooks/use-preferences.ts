import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  getUserPreferences,
  upsertUserPreferences,
} from "@/features/preferences/services/preference-service";
import type { UserPreferences } from "@/types/domain";

export function useUserPreferences() {
  const { user, status } = useAuth();

  return useQuery({
    queryKey: ["userPreferences", user?.id],
    queryFn: () => {
      if (!user?.id) return null;
      return getUserPreferences(user.id);
    },
    enabled: status === "authenticated" && !!user?.id,
  });
}

export function useUpsertUserPreferences() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (data: Partial<UserPreferences>) => {
      if (!user?.id) {
        throw new Error("You must be authenticated to update preferences.");
      }
      return upsertUserPreferences(user.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userPreferences"] });
    },
  });
}
