import { z } from "zod";

export const profileSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(
      /^[a-z0-9][a-z0-9_-]{2,29}$/,
      "Username must start with a letter or number and contain only lowercase letters, numbers, underscores, or hyphens",
    ),
  displayName: z
    .string()
    .max(100, "Display name must be at most 100 characters")
    .nullable()
    .or(z.literal("")),
  bio: z
    .string()
    .max(500, "Bio must be at most 500 characters")
    .nullable()
    .or(z.literal("")),
  defaultIdentityMode: z.enum(["public", "anonymous"], {
    required_error: "Identity preference is required",
  }),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
