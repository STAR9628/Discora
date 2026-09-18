export interface AdminOverviewStats {
  active_discussions: number;
  active_debates: number;
  private_rooms: number;
  archived_rooms: number;
  pending_flags: number;
  pending_feedback: number;
  total_audit_events: number;
}

export interface AdminRoomItem {
  id: string;
  title: string;
  slug: string;
  room_type: string;
  visibility: string;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  participant_count: number;
  message_count: number;
}

export interface AdminFeedbackItem {
  id: string;
  user_id: string | null;
  username: string | null;
  category: "bug" | "confusing_ux" | "suggestion" | "general";
  description: string;
  page_url: string | null;
  status: "new" | "reviewed" | "archived";
  created_at: string;
}

export interface AdminAuditLogItem {
  id: string;
  admin_id: string;
  admin_username: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PrivateRoomInspectionPayload {
  room: {
    id: string;
    title: string;
    description: string | null;
    slug: string;
    room_type: string;
    visibility: string;
    status: string;
    created_by: string | null;
    created_at: string;
    updated_at: string;
  };
  messages: Array<{
    id: string;
    content: string;
    message_type: string;
    identity_mode: string;
    created_at: string;
  }>;
  claims: Array<{
    id: string;
    text: string;
    created_at: string;
  }>;
  evidence: Array<{
    id: string;
    claim_id: string;
    title: string;
    url: string;
    direction: string;
    created_at: string;
  }>;
}
