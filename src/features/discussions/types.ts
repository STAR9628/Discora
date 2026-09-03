import type { Topic, Room, IdentityMode, QuestionType, DebateSide, DebateStatus } from "@/types/domain";

export type { Topic, Room, QuestionType };

export interface Discussion {
  id: string; // references Room.id
  openingStatement: string;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  roomId: string;
  userId: string | null;
  parentMessageId: string | null;
  content: string;
  identityMode: IdentityMode;
  messageType: "message" | "question" | "system";
  createdAt: string;
  updatedAt: string;
}

// Representing the row fetched from the public.discussion_messages database view
export interface DiscussionMessage {
  id: string;
  roomId: string;
  parentMessageId: string | null;
  content: string;
  identityMode: IdentityMode;
  messageType: "message" | "question" | "system";
  createdAt: string;
  updatedAt: string;
  userId: string | null; // Redacted (null) if identity_mode = 'anonymous'
  username: string | null; // 'Anonymous' if identity_mode = 'anonymous', 'Deleted User' if user_id is null
  avatarUrl: string | null; // null if identity_mode = 'anonymous' or user_id is null
  isModerated: boolean;
}

export interface Question {
  id: string;
  roomId: string;
  createdBy: string | null;
  content: string;
  questionType: QuestionType;
  identityMode: IdentityMode;
  isRetracted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DiscussionQuestion {
  id: string;
  roomId: string;
  content: string;
  questionType: QuestionType;
  identityMode: IdentityMode;
  isRetracted: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  username: string | null;
  avatarUrl: string | null;
}

export interface Debate {
  id: string;
  propositionTitle: string;
  oppositionTitle: string;
  openingStatement: string | null;
  status: DebateStatus;
  resolution: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  propositionClaimCount: number;
  oppositionClaimCount: number;
  propositionParticipantCount: number;
  oppositionParticipantCount: number;
  neutralParticipantCount: number;
  totalClaims: number;
  totalParticipants: number;
  totalEvidence: number;
  lastActivityAt: string;
}

export interface DebateParticipant {
  id: string;
  roomId: string;
  userId: string;
  side: DebateSide;
  joinedAt: string;
}

export interface DebateSideChange {
  id: string;
  roomId: string;
  userId: string;
  previousSide: "proposition" | "opposition";
  newSide: "proposition" | "opposition";
  reason: string;
  createdAt: string;
}

export interface Claim {
  id: string;
  roomId: string;
  createdBy: string | null;
  originMessageId: string | null;
  questionId: string | null;
  content: string;
  claimType: "fact" | "opinion" | "prediction" | "proposal" | "observation";
  contextType: ClaimContextType;
  identityMode: IdentityMode;
  isRetracted: boolean;
  debateSide?: DebateSide | null;
  createdAt: string;
  updatedAt: string;
  agreeCount?: number;
  disagreeCount?: number;
  consensusRatio?: number | null;
  userVote?: "agree" | "disagree" | null;
}

export interface DiscussionClaim {
  id: string;
  roomId: string;
  originMessageId: string | null;
  questionId: string | null;
  content: string;
  claimType: "fact" | "opinion" | "prediction" | "proposal" | "observation";
  contextType: ClaimContextType;
  identityMode: IdentityMode;
  isRetracted: boolean;
  debateSide?: DebateSide | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  username: string | null;
  avatarUrl: string | null;
  agreeCount?: number;
  disagreeCount?: number;
  consensusRatio?: number | null;
  userVote?: "agree" | "disagree" | null;
}

export interface Source {
  id: string;
  title: string;
  url: string | null;
  filePath: string | null;
  isRetracted: boolean;
  createdBy: string | null;
  createdAt: string;
}

export interface Evidence {
  id: string;
  roomId: string;
  sourceId: string;
  createdBy: string | null;
  content: string;
  evidenceType: "scientific" | "statistical" | "documentary" | "visual" | "experiential" | "expert" | "historical" | "logical" | "ethical" | "cultural";
  identityMode: IdentityMode;
  isRetracted: boolean;
  createdAt: string;
  updatedAt: string;
  agreeCount?: number;
  disagreeCount?: number;
  consensusRatio?: number | null;
  userVote?: "agree" | "disagree" | null;
}

export interface DiscussionEvidence {
  id: string;
  roomId: string;
  sourceId: string;
  content: string;
  evidenceType: "scientific" | "statistical" | "documentary" | "visual" | "experiential" | "expert" | "historical" | "logical" | "ethical" | "cultural";
  identityMode: IdentityMode;
  isRetracted: boolean;
  createdAt: string;
  updatedAt: string;
  claimId: string;
  direction: "support" | "contradict" | "context";
  createdBy: string | null;
  username: string | null;
  avatarUrl: string | null;
  sourceTitle: string;
  sourceUrl: string | null;
  sourceFilePath: string | null;
  sourceIsRetracted: boolean;
  agreeCount?: number;
  disagreeCount?: number;
  consensusRatio?: number | null;
  userVote?: "agree" | "disagree" | null;
}

export type ClaimContextType =
  | "supporting_idea"
  | "counterpoint"
  | "observation"
  | "open_question";

export type ClaimRelationType = "supports" | "contradicts" | "refines";

export interface ClaimRelation {
  id: string;
  roomId: string;
  sourceClaimId: string;
  targetClaimId: string;
  relationType: ClaimRelationType;
  createdBy: string | null;
  createdAt: string;
}

export interface DiscussionClaimRelation {
  id: string;
  roomId: string;
  sourceClaimId: string;
  targetClaimId: string;
  relationType: ClaimRelationType;
  createdBy: string | null;
  createdAt: string;
  sourceClaimContent: string;
  sourceClaimType: string;
  targetClaimContent: string;
  targetClaimType: string;
}

export type SearchResultType = "room" | "message" | "claim" | "evidence" | "question";

export interface SearchResult {
  entityId: string;
  resultType: SearchResultType;
  roomId: string;
  roomSlug: string;
  roomTitle: string;
  roomType?: "discussion" | "debate" | null;
  content: string | null;
  excerpt: string | null;
  authorUsername: string | null;
  authorAvatarUrl: string | null;
  createdAt: string;
  rank: number;
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  query: string;
  hasMore: boolean;
}

export type ModerationStatus = "pending" | "resolved_hidden" | "resolved_dismissed" | "resolved_restored";

export interface ModerationFlag {
  id: string;
  messageId: string | null;
  questionId: string | null;
  claimId: string | null;
  evidenceId: string | null;
  entityType: "message" | "question" | "claim" | "evidence" | "unknown";
  reason: string;
  status: ModerationStatus;
  createdAt: string;
  resolvedAt: string | null;
  content: string | null;
  authorUsername: string | null;
  authorAvatarUrl: string | null;
}
