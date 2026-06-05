import type { Topic, Room, IdentityMode, QuestionType } from "@/types/domain";

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
  userId: string | null; // Null if deleted user
  parentMessageId: string | null;
  content: string;
  identityMode: IdentityMode;
  messageType: "message" | "question";
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
  messageType: "message" | "question";
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

export interface Claim {
  id: string;
  roomId: string;
  createdBy: string | null;
  originMessageId: string | null;
  questionId: string | null; // added
  content: string;
  claimType: "fact" | "opinion" | "prediction" | "proposal" | "observation";
  identityMode: IdentityMode;
  isRetracted: boolean;
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
  questionId: string | null; // added
  content: string;
  claimType: "fact" | "opinion" | "prediction" | "proposal" | "observation";
  identityMode: IdentityMode;
  isRetracted: boolean;
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

export type SearchResultType = "room" | "message" | "claim" | "evidence" | "question";

export interface SearchResult {
  entityId: string;
  resultType: SearchResultType;
  roomId: string;
  roomSlug: string;
  roomTitle: string;
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
