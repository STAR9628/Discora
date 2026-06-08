export type UserRole = "guest" | "user" | "moderator" | "admin";

export type IdentityMode = "public" | "anonymous";

export type RoomType = "discussion" | "debate" | "private";

export type RoomVisibility = "public" | "private";

export type RoomStatus = "open" | "inactive" | "archived";

/**
 * Implemented domain types — used by current sprints (discussions, profiles, auth).
 */

export type ClaimType =
  | "fact"
  | "opinion"
  | "prediction"
  | "proposal"
  | "observation";

export type ClaimContextType =
  | "supporting_idea"
  | "counterpoint"
  | "observation"
  | "open_question";

/**
 * Evidence categories enforced in DB (`evidence_type_check`) and
 * `src/features/discussions`. Not the legacy `EvidenceType` union below.
 */
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
  slug: string;
  roomType: RoomType;
  visibility: RoomVisibility;
  status: RoomStatus;
  createdBy: string;
  topicId?: string;
};

/**
 * FUTURE ROADMAP TYPES
 * Reserved for Sprint 7+ features. Not referenced by runtime code today.
 * See docs/23_KNOWLEDGE_MODEL.md and docs/37_QUESTION_ARCHITECTURE_ADR_DRAFT.md.
 */

/** @future Sprint 7+ — structured debates (separate from discussion rooms). */
export type DebatePosition = "pro" | "con" | "neutral";

/**
 * @future Superseded at runtime by `EvidenceCategory` and DB `evidence_type`.
 * Kept for early architecture sketches only.
 */
export type EvidenceType = "supporting" | "contradicting" | "contextual";

/** @future Sprint 7+ — first-class Question entity taxonomy. */
export type QuestionType =
  | "information"
  | "clarification"
  | "perspective"
  | "evidence"
  | "directional"
  | "reflective";

/**
 * @future Polymorphic voting was rejected (ADR Sprint 6).
 * Production voting: `claim_votes` and `evidence_votes` only.
 */
export type VoteTargetType = "message" | "claim" | "question" | "evidence";

/** @future Shared agree/disagree enum for vote tables when extended. */
export type VoteType = "agree" | "disagree";

/** @future Pins / highlights — not implemented. */
export type PinTargetType = "message" | "claim" | "question" | "evidence";

/** @future Pins — not implemented. */
export type PinType = "personal" | "public";

/** @future Pins — not implemented. */
export type PinStatus = "active" | "pending_vote" | "rejected";

/** @future Pin voting — not implemented. */
export type PinVoteType = "support" | "reject";

/** @future Moderation reports — not implemented. */
export type ReportTargetType =
  | "message"
  | "claim"
  | "evidence"
  | "source"
  | "question";

/** @future Moderation workflow — not implemented. */
export type ReportStatus =
  | "pending"
  | "ai_review"
  | "human_review"
  | "resolved"
  | "dismissed";

/** @future Notifications center — not implemented. */
export type NotificationType =
  | "reply_received"
  | "debate_invitation"
  | "debate_request"
  | "pin_suggestion"
  | "mention"
  | "report_update";

/** @future Source uploads beyond URL citations — not implemented. */
export type SourceType = "url" | "pdf" | "image" | "video";
