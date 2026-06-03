import type { z } from "zod";

export function getFieldErrors<TValues extends Record<string, unknown>>(
  result: z.SafeParseError<TValues>,
) {
  return result.error.flatten().fieldErrors;
}
