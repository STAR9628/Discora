import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  getProfileByUserId,
  getProfileByUsername,
  createProfile,
  updateProfile,
} from "@/features/profiles/services/profile-service";

/**
 * Hook to retrieve public profile by username
 */
export function useProfile(username: string) {
  return useQuery({
    queryKey: ["profile", username.toLowerCase()],
    queryFn: () => getProfileByUsername(username),
    enabled: !!username,
  });
}

/**
 * Hook to retrieve the current logged-in user's profile
 */
export function useCurrentProfile() {
  const { user, status } = useAuth();
  
  return useQuery({
    queryKey: ["profile", "current", user?.id],
    queryFn: () => {
      if (!user?.id) return null;
      return getProfileByUserId(user.id);
    },
    enabled: status === "authenticated" && !!user?.id,
  });
}

/**
 * Mutation hook to create user profile (first-time setup)
 */
export function useCreateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (data: {
      username: string;
      bio?: string | null;
      defaultIdentityMode: "public" | "anonymous";
      avatarUrl?: string | null;
    }) => {
      if (!user?.id) {
        throw new Error("You must be authenticated to create a profile.");
      }
      return createProfile(user.id, data);
    },
    onSuccess: () => {
      // Invalidate current and username-specific queries
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

/**
 * Mutation hook to update user profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (data: {
      username?: string;
      bio?: string | null;
      defaultIdentityMode?: "public" | "anonymous";
      avatarUrl?: string | null;
    }) => {
      if (!user?.id) {
        throw new Error("You must be authenticated to update a profile.");
      }
      return updateProfile(user.id, data);
    },
    onSuccess: () => {
      // Invalidate current and username-specific queries
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
