import type { SupabaseClient } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/services/supabase/client";
import { mapSupabaseError } from "@/lib/errors";

export interface FoundingStatus {
  hasDiscussion: boolean;
  hasDebate: boolean;
  isFoundingMember: boolean;
}

function getClient(overrideClient?: SupabaseClient): SupabaseClient {
  return overrideClient || createBrowserSupabaseClient();
}

/**
 * Evaluate the caller's lightweight Founding Participant eligibility
 * (account + >=1 discussion participation + >=1 debate participation).
 *
 * The database RPC automatically grants profiles.is_founding_member to the
 * caller when the criteria are satisfied. Display recognition only — no
 * privileges, reputation, ranking, or epistemic effects.
 */
export async function evaluateFoundingStatus(
  overrideClient?: SupabaseClient,
): Promise<FoundingStatus> {
  const supabase = getClient(overrideClient);
  const { data, error } = await supabase.rpc("evaluate_founding_status");

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to check Founding Participant status"));
  }

  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined;
  return {
    hasDiscussion: Boolean(row?.has_discussion),
    hasDebate: Boolean(row?.has_debate),
    isFoundingMember: Boolean(row?.is_founding_member),
  };
}
