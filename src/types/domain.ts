export type UserRole = "guest" | "user" | "moderator" | "admin";

export type IdentityMode = "public" | "anonymous";

export type RoomType = "discussion" | "debate" | "private";

export type RoomVisibility = "public" | "private";

export type RoomStatus = "open" | "inactive" | "archived";

export type DebatePosition = "pro" | "con" | "neutral";

export type ClaimType =
  | "fact"
  | "opinion"
  | "prediction"
  | "proposal"
  | "observation";

export type EvidenceType = "supporting" | "contradicting" | "contextual";

export type EvidenceCategory =
  | "scientific"
  | "statistical"
  | "documentary"
  | "visual"
  | "experiential"
  | "expert"
  | "historical"
  | "logical"
  | "ethical"
  | "cultural";

export type SourceType = "url" | "pdf" | "image" | "video";

export type QuestionType =
  | "information"
  | "clarification"
  | "perspective"
  | "evidence"
  | "directional"
  | "reflective";

export type VoteTargetType = "message" | "claim" | "question" | "evidence";

export type VoteType = "agree" | "disagree";

export type PinTargetType = "message" | "claim" | "question" | "evidence";

export type PinType = "personal" | "public";

export type PinStatus = "active" | "pending_vote" | "rejected";

export type PinVoteType = "support" | "reject";

export type ReportTargetType =
  | "message"
  | "claim"
  | "evidence"
  | "source"
  | "question";

export type ReportStatus =
  | "pending"
  | "ai_review"
  | "human_review"
  | "resolved"
  | "dismissed";

export type NotificationType =
  | "reply_received"
  | "debate_invitation"
  | "debate_request"
  | "pin_suggestion"
  | "mention"
  | "report_update";

export type BaseEntity = {
  id: string;
  createdAt: string;
  updatedAt?: string;
};

export type UserProfile = BaseEntity & {
  username: string;
  bio: string | null;
  avatarUrl: string | null;
  defaultIdentityMode: IdentityMode;
  lastUsernameChange: string | null;
  joinedAt: string;
  role?: UserRole;
};

export type Topic = BaseEntity & {
  name: string;
  description?: string;
  slug: string;
  createdBy: string;
  isPlatformTopic: boolean;
};

export type Room = BaseEntity & {
  title: string;
  description?: string;
  roomType: RoomType;
  visibility: RoomVisibility;
  status: RoomStatus;
  createdBy: string;
  topicId?: string;
};
