import { z } from "zod";

export const privacySchema = z.object({
  showReputation: z.boolean(),
  showExpertise: z.boolean(),
  showSideSwitches: z.boolean(),
});

export type PrivacyFormValues = z.infer<typeof privacySchema>;
