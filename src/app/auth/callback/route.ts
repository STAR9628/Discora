import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  OAUTH_NEXT_COOKIE_NAME,
  resolveOAuthDestination,
} from "@/lib/security/oauth-destination";

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

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  // Destination precedence: short-lived OAuth cookie (set by loginWithGoogle
  // before redirecting to the provider), then the legacy ?next= query value
  // (preserves email verification / password-reset flows), else "/".
  // Both are re-validated against the shared allow-list; the cookie is
  // consumed (deleted) on every response below.
  const next = resolveOAuthDestination(
    request.cookies.get(OAUTH_NEXT_COOKIE_NAME)?.value ?? null,
    requestUrl.searchParams.get("next") ||
      requestUrl.searchParams.get("redirectedFrom"),
  );

  if (code) {
    const response = NextResponse.redirect(new URL(next, requestUrl.origin));

    // Track which cookie names the new session writes (set by applyServerStorage).
    const newSessionCookieNames = new Set<string>();

    const supabase = createServerClient(
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
              newSessionCookieNames.add(name);
              response.cookies.set(name, value, options);
            });
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // --- Stale-cookie purge ---
      // After exchangeCodeForSession, @supabase/ssr's applyServerStorage calls
      // setAll with the new session chunks.  However it can only remove cookies
      // it knows about from getAll() (request.cookies).  If the browser's jar
      // held an unchunked base key *and* the request already sent it, ssr will
      // have included it in the deletion set — but if combineChunks still finds
      // the base key later (e.g. because a same-name header interaction left it
      // alive), we need a belt-and-suspenders purge.
      //
      // Strategy: scan every incoming request cookie whose name looks like an
      // auth-token cookie.  Any such cookie NOT already covered by the new
      // session's setAll (newSessionCookieNames) must be explicitly expired on
      // the response so the browser removes it.
      const staleDeletionOptions = {
        path: "/",
        maxAge: 0,
        sameSite: "lax" as const,
        httpOnly: false,
        secure: requestUrl.protocol === "https:",
      };

      for (const cookie of request.cookies.getAll()) {
        if (
          isAuthTokenCookie(cookie.name) &&
          !newSessionCookieNames.has(cookie.name)
        ) {
          // Explicitly expire any auth-token cookie from the old session that
          // applyServerStorage did not already handle.
          response.cookies.set(cookie.name, "", staleDeletionOptions);
        }
      }

      response.headers.set(
        "Cache-Control",
        "no-store, no-cache, must-revalidate, max-age=0",
      );
      // Consume the one-time destination cookie on success.
      response.cookies.set(OAUTH_NEXT_COOKIE_NAME, "", {
        path: "/",
        maxAge: 0,
        sameSite: "lax",
        secure: requestUrl.protocol === "https:",
      });
      return response;
    }
  }

  const failureResponse = NextResponse.redirect(
    new URL("/login?authError=verification", requestUrl.origin),
  );
  // Consume the one-time destination cookie on failure as well.
  failureResponse.cookies.set(OAUTH_NEXT_COOKIE_NAME, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    secure: requestUrl.protocol === "https:",
  });
  return failureResponse;
}
