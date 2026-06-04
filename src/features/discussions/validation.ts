import { z } from "zod";

export const discussionSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(100, "Title must be at most 100 characters"),
  description: z
    .string()
    .max(300, "Description must be at most 300 characters")
    .optional()
    .or(z.literal("")),
  openingStatement: z
    .string()
    .min(100, "Opening statement must be at least 100 characters")
    .max(5000, "Opening statement must be at most 5000 characters"),
  summary: z
    .string()
    .max(200, "Summary must be at most 200 characters")
    .optional()
    .or(z.literal("")),
  topicId: z.string().uuid("Please select a valid topic"),
});

export const messageSchema = z.object({
  content: z
    .string()
    .min(1, "Message content cannot be empty")
    .max(2000, "Message content must be at most 2000 characters"),
  identityMode: z.enum(["public", "anonymous"], {
    required_error: "Identity mode is required",
  }),
});

export const claimSchema = z.object({
  content: z
    .string()
    .min(25, "Claim content must be at least 25 characters")
    .max(500, "Claim content must be at most 500 characters"),
  claimType: z.enum(["fact", "opinion", "prediction", "proposal", "observation"], {
    required_error: "Claim type is required",
  }),
  identityMode: z.enum(["public", "anonymous"], {
    required_error: "Identity mode is required",
  }),
});

export const evidenceSchema = z.object({
  content: z
    .string()
    .min(50, "Evidence content must be at least 50 characters")
    .max(1000, "Evidence content must be at most 1000 characters"),
  evidenceType: z.enum(
    ["scientific", "statistical", "documentary", "visual", "experiential", "expert", "historical", "logical", "ethical", "cultural"],
    { required_error: "Evidence type is required" }
  ),
  identityMode: z.enum(["public", "anonymous"], {
    required_error: "Identity mode is required",
  }),
  direction: z.enum(["support", "contradict", "context"], {
    required_error: "Relationship direction is required",
  }),
  sourceTitle: z
    .string()
    .min(5, "Source title must be at least 5 characters")
    .max(150, "Source title must be at most 150 characters"),
  sourceUrl: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
}).refine((data) => data.sourceUrl && data.sourceUrl.trim().length > 0, {
  message: "A source URL is required",
  path: ["sourceUrl"],
});

export const questionSchema = z.object({
  content: z
    .string()
    .min(10, "Question content must be at least 10 characters")
    .max(500, "Question content must be at most 500 characters"),
  questionType: z.enum(["information", "clarification", "perspective", "evidence", "directional", "reflective"], {
    required_error: "Question type is required",
  }),
  identityMode: z.enum(["public", "anonymous"], {
    required_error: "Identity mode is required",
  }),
});

export type DiscussionFormValues = z.infer<typeof discussionSchema>;
export type MessageFormValues = z.infer<typeof messageSchema>;
export type ClaimFormValues = z.infer<typeof claimSchema>;
export type EvidenceFormValues = z.infer<typeof evidenceSchema>;
export type QuestionFormValues = z.infer<typeof questionSchema>;
