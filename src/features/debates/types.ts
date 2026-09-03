export type InquiryType = "clarification" | "evidence_request" | "assumption_check";

export type InquiryStatus = "open" | "responded" | "satisfied" | "unsatisfied" | "closed";

export interface InquiryItem {
  id: string;
  roomId: string;
  createdBy: string;
  inquirerSide: string | null;
  inquiryType: InquiryType;
  content: string;
  targetClaimId: string;
  status: InquiryStatus;
  createdAt: string;
  updatedAt: string;
  username: string | null;
  avatarUrl: string | null;
  responseCount: number;
}

export interface InquiryResponse {
  id: string;
  inquiryItemId: string;
  createdBy: string;
  content: string;
  createdAt: string;
  username: string | null;
  avatarUrl: string | null;
}
