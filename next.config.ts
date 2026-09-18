import type { NextConfig } from "next";

/**
 * Local-development production-targeting guard (developer safety, no behavior change).
 *
 * `npm run dev` must never accidentally run against the hosted production
 * Supabase project. If the configured public Supabase URL points at Supabase
 * Cloud (`*.supabase.co`) while NOT building/running for production, fail
 * closed with an actionable error instead of sending local activity to prod.
 *
 * - Production builds/deployments are unaffected: `next build` and `next start`
 *   run with NODE_ENV=production and skip this check entirely.
 * - Intentional remote development (e.g. staging) remains possible via the
 *   explicit escape hatch DISCORA_ALLOW_REMOTE_DEV=true.
 * - No secrets are printed here: only the URL hostname (never keys/tokens).
 */
if (process.env.NODE_ENV !== "production") {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  let hostname = "";
  try {
    hostname = new URL(rawUrl).hostname;
  } catch {
    // Unset/malformed: the Supabase config validation reports that separately.
  }
  const allowRemoteDev = process.env.DISCORA_ALLOW_REMOTE_DEV === "true";
  if (hostname.endsWith(".supabase.co") && !allowRemoteDev) {
    throw new Error(
      `[discora] Local development is configured to use a hosted Supabase project (${hostname}). ` +
        `Refusing to start: point NEXT_PUBLIC_SUPABASE_URL at local Supabase ` +
        `(http://127.0.0.1:54321, see .env.example) before running "npm run dev". ` +
        `For intentional remote development, set DISCORA_ALLOW_REMOTE_DEV=true.`,
    );
  }
}

const nextConfig: NextConfig = {};

export default nextConfig;
