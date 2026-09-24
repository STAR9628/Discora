/**
 * Validates and sanitizes redirect targets to prevent open redirect vulnerabilities.
 *
 * Rules:
 * - Must start with a single '/'
 * - Must not start with '//' (protocol-relative) or '/\\'
 * - Must not contain control characters or null bytes
 * - Must resolve to an internal pathname on the current origin
 * - Rejects external URLs (e.g. https://evil.com, http://evil.com, //evil.com)
 * - Preserves legitimate internal paths, query parameters, and hashes
 */
export function getSafeRedirectUrl(
  target: string | null | undefined,
  fallback = "/"
): string {
  if (!target || typeof target !== "string") {
    return fallback;
  }

  const trimmed = target.trim();
  if (!trimmed) {
    return fallback;
  }

  // Must start with '/' and must not start with '//' or '/\'
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return fallback;
  }

  // Reject control characters, CR, LF, null byte
  if (/[\r\n\0\x00-\x1F\x7F]/.test(trimmed)) {
    return fallback;
  }

  try {
    // Parse against a dummy base origin to verify strict pathname resolution
    const parsed = new URL(trimmed, "http://localhost");

    if (parsed.origin !== "http://localhost") {
      return fallback;
    }

    if (!parsed.pathname.startsWith("/") || parsed.pathname.startsWith("//")) {
      return fallback;
    }

    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return fallback;
  }
}

/**
 * OAuth residue parameters. These are consumed by the authentication flow
 * itself (authorization codes, error responses, email-link tokens) and must
 * never survive inside a post-login redirect target: the success redirect
 * echoes `next` verbatim, so a stale residue would self-perpetuate in the
 * browser URL across logins. Only these names are removed; legitimate
 * application parameters (highlight, question, discussion lenses, etc.)
 * are preserved untouched.
 */
const OAUTH_RESIDUE_PARAMS = [
  "code",
  "error",
  "error_code",
  "error_description",
  "token_hash",
  "type",
] as const;

/**
 * Remove OAuth-only residue query parameters from an already-validated
 * redirect target string (relative path, optional query and hash).
 *
 * Operates purely on the target string. Does not touch OAuth codes in
 * flight, sessions, cookies, PKCE state, or code exchange.
 */
export function stripOAuthResidue(target: string): string {
  if (!target || typeof target !== "string") {
    return target;
  }

  const hashIndex = target.indexOf("#");
  const hash = hashIndex >= 0 ? target.slice(hashIndex) : "";
  const withoutHash = hashIndex >= 0 ? target.slice(0, hashIndex) : target;

  const queryIndex = withoutHash.indexOf("?");
  if (queryIndex < 0) {
    return target;
  }

  const path = withoutHash.slice(0, queryIndex);
  const query = withoutHash.slice(queryIndex + 1);
  if (!query) {
    return path + hash;
  }

  const params = new URLSearchParams(query);
  let changed = false;
  for (const name of OAUTH_RESIDUE_PARAMS) {
    if (params.has(name)) {
      params.delete(name);
      changed = true;
    }
  }

  if (!changed) {
    return target;
  }

  const remaining = params.toString();
  return path + (remaining ? `?${remaining}` : "") + hash;
}
