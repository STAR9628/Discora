import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { createBrowserSupabaseClient } from "@/services/supabase/client";
import { getDiscussions } from "@/features/discussions/services/discussion-service";
import { getDebates } from "@/features/debates/services/debate-service";
import { getHomepageMetrics, getFeaturedInquiries } from "../services/homepage-service";
import {
  getMyOpenInquiries,
  getMyInquiryResponses,
  getMyDebatesAttention,
  getMyTopicEvidence,
  getMyUnderstandingEvolved,
} from "../services/homepage-personal-service";

export function useHomepageMetrics() {
  return useQuery({
    queryKey: ["homepage", "metrics"],
    queryFn: getHomepageMetrics,
    staleTime: 2 * 60 * 1000,
  });
}

export function useFeaturedInquiries(limit = 3) {
  return useQuery({
    queryKey: ["homepage", "featured-inquiries", limit],
    queryFn: () => getFeaturedInquiries(limit),
    staleTime: 2 * 60 * 1000,
  });
}

export function useHomepageDiscussions(max = 10) {
  return useQuery({
    queryKey: ["homepage", "discussions", max],
    queryFn: () => getDiscussions(max),
    staleTime: 30_000,
  });
}

export function useHomepageDebates() {
  return useQuery({
    queryKey: ["homepage", "debates"],
    queryFn: () => getDebates("active", "most_active", null, 20),
    staleTime: 30_000,
  });
}

export function useRecentDiscussions(max = 5) {
  return useQuery({
    queryKey: ["homepage", "recent-discussions", max],
    queryFn: () => getDiscussions(max),
    staleTime: 2 * 60 * 1000,
  });
}

export function useRecentDebates(limit = 5) {
  return useQuery({
    queryKey: ["homepage", "recent-debates", limit],
    queryFn: () => getDebates("active", "newest", null, limit),
    staleTime: 2 * 60 * 1000,
  });
}

export function useMyOpenInquiries() {
  const { status } = useAuth();
  return useQuery({
    queryKey: ["homepage", "my-open-inquiries"],
    queryFn: getMyOpenInquiries,
    enabled: status === "authenticated",
    staleTime: 30_000,
  });
}

export function useMyInquiryResponses() {
  const { status } = useAuth();
  return useQuery({
    queryKey: ["homepage", "my-inquiry-responses"],
    queryFn: getMyInquiryResponses,
    enabled: status === "authenticated",
    staleTime: 30_000,
  });
}

export function useMyDebatesAttention() {
  const { status } = useAuth();
  return useQuery({
    queryKey: ["homepage", "my-debates-attention"],
    queryFn: getMyDebatesAttention,
    enabled: status === "authenticated",
    staleTime: 30_000,
  });
}

export function useMyTopicEvidence(days = 7) {
  const { status } = useAuth();
  return useQuery({
    queryKey: ["homepage", "my-topic-evidence", days],
    queryFn: () => getMyTopicEvidence(days),
    enabled: status === "authenticated",
    staleTime: 2 * 60 * 1000,
  });
}

export function useMyUnderstandingEvolved() {
  const { status } = useAuth();
  return useQuery({
    queryKey: ["homepage", "my-understanding-evolved"],
    queryFn: getMyUnderstandingEvolved,
    enabled: status === "authenticated",
    staleTime: 30_000,
  });
}

export function useOnboardingStatus() {
  const { user, status } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: ["homepage", "onboarding", userId],
    queryFn: async () => {
      const supabase = createBrowserSupabaseClient();
      const [roomsRes, claimsRes, votesRes] = await Promise.all([
        supabase.from("rooms").select("id", { count: "exact", head: true }).eq("created_by", userId!),
        supabase.from("claims").select("id", { count: "exact", head: true }).eq("created_by", userId!),
        supabase.from("claim_votes").select("id", { count: "exact", head: true }).eq("user_id", userId!),
      ]);
      const roomCount = roomsRes.count ?? 0;
      const claimCount = claimsRes.count ?? 0;
      const voteCount = votesRes.count ?? 0;
      return { isFirstTime: roomCount === 0 && claimCount === 0 && voteCount === 0 };
    },
    enabled: status === "authenticated" && !!userId,
    staleTime: 10 * 60 * 1000,
  });
}
