export type SaveTargetType = "discussion" | "debate" | "claim" | "evidence";

export interface UserSave {
  id: string;
  user_id: string;
  target_type: SaveTargetType;
  target_id: string;
  created_at: string;
}

export interface SavedItem {
  id: string;
  targetType: SaveTargetType;
  targetId: string;
  createdAt: string;
  title: string;
  slug?: string;
  roomType?: "discussion" | "debate";
  roomTitle: string;
}

export interface SaveCheckResult {
  isSaved: boolean;
  isLoading: boolean;
}
