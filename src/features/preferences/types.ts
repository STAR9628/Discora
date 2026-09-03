import type { UserPreferences } from "@/types/domain";

export type { UserPreferences };

export interface DbUserPreferencesRow {
  id: string;
  user_id: string;
  show_reputation: boolean;
  show_expertise: boolean;
  show_side_switches: boolean;
  created_at: string;
  updated_at: string;
}

export function mapPreferencesRow(row: DbUserPreferencesRow): UserPreferences {
  return {
    showReputation: row.show_reputation,
    showExpertise: row.show_expertise,
    showSideSwitches: row.show_side_switches,
  };
}
