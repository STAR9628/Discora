import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  OAUTH_NEXT_COOKIE_NAME,
  resolveOAuthDestination,
  resolveRecoveryDestination,
} from "@/lib/security/oauth-destination";
import { buildCallbackSuccessHtml } from "./callback-success-html";
import {
  isRecoveryCallback,
  RECOVERY_VERIFIED_COOKIE_MAX_AGE,
  RECOVERY_VERIFIED_COOKIE_NAME,
} from "@/features/auth/utils/recovery-context";

/**
 * Returns true if a cookie name looks like a Supabase auth token or one of
 * its chunks (e.g. sb-*-auth-token, sb-*-auth-token.0, sb-*-auth-token.1).
 * Code-verifier cookies are intentionally excluded — they are handled
 * separately by @supabase/ssr.
 */
function isAuthTokenCookie(name: string): boolean {
  return (
    /^sb-.+-auth-token(\.\d+)?$/.test(name) &&
    !name.endsWith("-code-verifier")
  );
}

/** Cookies collected during verification, applied to the final response. */
interface PendingCookie {
  name: string;
  value: string;
  options?: {
    domain?: string;
    expires?: Date;
    httpOnly?: boolean;
    maxAge?: number;
    path?: string;
    sameSite?: "lax" | "strict" | "none";
    secure?: boolean;
  };
}

/**
 * Server Supabase client wired to collect (not yet apply) every cookie the
 * verification writes. The caller applies `pending` to exactly one final
 * response, so session cookies are never lost across the 200-HTML envelope.
 */
function createCallbackSupabaseClient(
  request: NextRequest,
  pending: PendingCookie[],
  writtenNames: Set<string>,
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Track every cookie name the new session issues
            // (both the new chunks with maxAge > 0 and any that ssr already
            // marks for deletion with maxAge = 0).
            writtenNames.add(name);
            // Normalize ssr cookie options to Next.js response-cookie shape.
            // sameSite is narrowed (ssr types permit boolean) — a
            // non-string value falls back to omitting the attribute.
            const sameSite =
              options.sameSite === "lax" ||
              options.sameSite === "strict" ||
              options.sameSite === "none"
                ? options.sameSite
                : undefined;
            pending.push({
              name,
              value,
              options: {
                domain: options.domain,
                expires: options.expires,
                httpOnly: options.httpOnly,
                maxAge: options.maxAge,
                path: options.path,
                sameSite,
                secure: options.secure,
              },
            });
          });
        },
      },
    },
  );
}

/**
 * Belt-and-suspenders purge: expire any incoming auth-token cookie the new
 * session did not already cover, so stale sessions cannot linger.
 */
function collectStaleDeletions(
  request: NextRequest,
  writtenNames: Set<string>,
  pending: PendingCookie[],
  secure: boolean,
) {
  for (const cookie of request.cookies.getAll()) {
    if (isAuthTokenCookie(cookie.name) && !writtenNames.has(cookie.name)) {
      pending.push({
        name: cookie.name,
        value: "",
        options: {
          path: "/",
          maxAge: 0,
          sameSite: "lax",
          httpOnly: false,
          secure,
        },
      });
    }
  }
}

function consumeDestinationCookie(response: NextResponse, secure: boolean) {
  response.cookies.set(OAUTH_NEXT_COOKIE_NAME, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    secure,
  });
}

/**
 * Finalize a successful verification as HTTP 200 HTML that navigates to the
 * validated destination. A 3xx is deliberately avoided: the Netlify redirect
 * layer preserves the incoming auth query string onto 3xx Locations, which
 * previously surfaced ?code= in the browser URL. HTML navigation carries
 * no query. Applies every collected cookie to this single response.
 */
function buildSuccessResponse(
  destination: string,
  pending: PendingCookie[],
  requestUrl: URL,
): NextResponse {
  const secure = requestUrl.protocol === "https:";
  const response = new NextResponse(buildCallbackSuccessHtml(destination), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
  for (const cookie of pending) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }
  consumeDestinationCookie(response, secure);
  return response;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const secure = requestUrl.protocol === "https:";

  if (code) {
    // Google OAuth branch (unchanged behavior).
    const next = resolveOAuthDestination(
      request.cookies.get(OAUTH_NEXT_COOKIE_NAME)?.value ?? null,
      requestUrl.searchParams.get("next") ||
        requestUrl.searchParams.get("redirectedFrom"),
    );

    const pending: PendingCookie[] = [];
    const writtenNames = new Set<string>();
    const supabase = createCallbackSupabaseClient(request, pending, writtenNames);

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      collectStaleDeletions(request, writtenNames, pending, secure);
      return buildSuccessResponse(next, pending, requestUrl);
    }
  }

  // Password-recovery branch: ?token_hash=...&type=recovery (email links).
  // Exactly one verifyOtp call; never exchangeCodeForSession for tokens.
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const recoveryType = requestUrl.searchParams.get("type");
  if (tokenHash && isRecoveryCallback(tokenHash, recoveryType)) {
    // Destination: explicit validated ?next= (what requestPasswordReset
    // sends), else the recovery default. The Google flow's one-time cookie
    // is foreign to recovery: always consumed below, never navigated to.
    const destination = resolveRecoveryDestination(
      requestUrl.searchParams.get("next") ||
        requestUrl.searchParams.get("redirectedFrom"),
    );

    const pending: PendingCookie[] = [];
    const writtenNames = new Set<string>();
    const supabase = createCallbackSupabaseClient(request, pending, writtenNames);

    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });

    if (!error) {
      collectStaleDeletions(request, writtenNames, pending, secure);
      // Mark this browser as recovery-verified: short-lived, httpOnly,
      // server-set only. The reset page requires this marker plus a live
      // session; it cannot be forged or read by client script.
      pending.push({
        name: RECOVERY_VERIFIED_COOKIE_NAME,
        value: "1",
        options: {
          path: "/",
          maxAge: RECOVERY_VERIFIED_COOKIE_MAX_AGE,
          sameSite: "lax",
          httpOnly: true,
          secure,
        },
      });
      return buildSuccessResponse(destination, pending, requestUrl);
    }
  }

  const failureResponse = NextResponse.redirect(
    new URL("/login?authError=verification", requestUrl.origin),
  );
  // Consume the one-time destination cookie on failure as well.
  consumeDestinationCookie(failureResponse, secure);
  return failureResponse;
}
