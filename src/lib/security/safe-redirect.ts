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
