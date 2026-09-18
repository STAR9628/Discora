import { headers } from "next/headers";

/**
 * Resolves the configured public origin of the application from the incoming
 * request headers (forwarded proto/host, falling back to host). Canonical and
 * Open Graph URLs must be absolute, so this derives the origin from the
 * deployment's real configuration instead of hardcoding a domain.
 */
export async function getSiteUrl(): Promise<string> {
  const header = await headers();
  const proto = header.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const host = header.get("x-forwarded-host") || header.get("host");
  return `${proto || "https"}://${host || "localhost:3000"}`;
}