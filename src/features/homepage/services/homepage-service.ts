import { createBrowserSupabaseClient } from "@/services/supabase/client";
import { mapSupabaseError } from "@/lib/errors";

export interface HomepageMetrics {
  openInquiries: number;
  claimsWithEvidence: number;
  debatesBothSides: number;
  satisfiedToday: number;
}

export interface FeaturedInquiry {
  id: string;
  roomId: string;
  roomTitle: string;
  roomSlug: string;
  content: string;
  inquiryType: string;
  status: string;
  targetClaimContent: string | null;
  responseCount: number;
  createdAt: string;
}

export async function getHomepageMetrics(): Promise<HomepageMetrics> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.rpc("get_homepage_metrics");
  if (error) throw new Error(mapSupabaseError(error, "Failed to load metrics"));
  const m = data as Record<string, number>;
  return {
    openInquiries: m?.open_inquiries ?? 0,
    claimsWithEvidence: m?.claims_with_evidence ?? 0,
    debatesBothSides: m?.debates_both_sides ?? 0,
    satisfiedToday: m?.satisfied_today ?? 0,
  };
}

export async function getFeaturedInquiries(limit: number = 3): Promise<FeaturedInquiry[]> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase.rpc("get_featured_inquiries", { p_limit: limit });
  if (error) throw new Error(mapSupabaseError(error, "Failed to load featured inquiries"));
  const rows = (data || []) as Record<string, unknown>[];
  return rows.map(mapFeaturedInquiry);
}

function mapFeaturedInquiry(row: Record<string, unknown>): FeaturedInquiry {
  return {
    id: String(row.id ?? ""),
    roomId: String(row.room_id ?? ""),
    roomTitle: String(row.room_title ?? ""),
    roomSlug: String(row.room_slug ?? ""),
    content: String(row.content ?? ""),
    inquiryType: String(row.inquiry_type ?? ""),
    status: String(row.status ?? ""),
    targetClaimContent: row.target_claim_content ? String(row.target_claim_content) : null,
    responseCount: Number(row.response_count ?? 0),
    createdAt: String(row.created_at ?? ""),
  };
}
