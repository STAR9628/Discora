import type { SupabaseClient } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/services/supabase/client";
import { mapSupabaseError } from "@/lib/errors";
import type { UserPreferences } from "@/types/domain";
import { mapPreferencesRow, type DbUserPreferencesRow } from "@/features/preferences/types";

function getClient(overrideClient?: SupabaseClient): SupabaseClient {
  return overrideClient || createBrowserSupabaseClient();
}

export async function getUserPreferences(
  userId: string,
  overrideClient?: SupabaseClient,
): Promise<UserPreferences | null> {
  const supabase = getClient(overrideClient);
  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to load preferences"));
  }

  return data ? mapPreferencesRow(data as DbUserPreferencesRow) : null;
}

export async function upsertUserPreferences(
  userId: string,
  data: Partial<UserPreferences>,
  overrideClient?: SupabaseClient,
): Promise<UserPreferences> {
  const supabase = getClient(overrideClient);
  const updateData: Record<string, boolean> = {};
  if (data.showReputation !== undefined) updateData.show_reputation = data.showReputation;
  if (data.showExpertise !== undefined) updateData.show_expertise = data.showExpertise;
  if (data.showSideSwitches !== undefined) updateData.show_side_switches = data.showSideSwitches;

  const { data: result, error } = await supabase
    .from("user_preferences")
    .upsert({
      user_id: userId,
      ...updateData,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(mapSupabaseError(error, "Failed to save preferences"));
  }

  return mapPreferencesRow(result as DbUserPreferencesRow);
}
