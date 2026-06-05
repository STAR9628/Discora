type SupabaseError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
} | null;

const ERROR_CODE_MAP: Record<string, string> = {
  "23505": "This record already exists.",
  "23503": "A required related record was not found.",
  "23514": "The provided data does not meet the required constraints.",
  "22P02": "Invalid identifier format.",
  "42501": "You do not have permission to perform this action.",
  "PGRST116": "The requested resource was not found.",
};

function matchMessagePattern(message: string): string | null {
  if (/duplicate key|already exists/.test(message)) {
    return "This record already exists.";
  }
  if (/foreign key|not present|violates foreign/.test(message)) {
    return "A required related record was not found.";
  }
  if (/permission|policy|violates row-level security/.test(message)) {
    return "You do not have permission to perform this action.";
  }
  if (/JWT|auth|invalid login credentials/.test(message)) {
    return "Authentication error. Please try logging in again.";
  }
  if (/fetch|network|Failed to fetch/.test(message)) {
    return "A network error occurred. Please check your connection and try again.";
  }
  if (/not-found|No rows/.test(message)) {
    return "The requested resource was not found.";
  }
  return null;
}

export function mapSupabaseError(
  error: SupabaseError,
  fallback: string,
): string {
  if (!error) return fallback;

  if (error.code) {
    const mapped = ERROR_CODE_MAP[error.code];
    if (mapped) return mapped;
  }

  if (error.message) {
    const match = matchMessagePattern(error.message);
    if (match) return match;

    if (error.message.length > 0 && error.message.length < 200) {
      const lower = error.message.toLowerCase();
      if (
        lower.includes("syntax") ||
        lower.includes("parser") ||
        lower.includes("column") ||
        lower.includes("relation") ||
        lower.includes("type")
      ) {
        return fallback;
      }
    }
  }

  return fallback;
}

export function serviceError(message: string): never {
  throw new Error(message);
}
