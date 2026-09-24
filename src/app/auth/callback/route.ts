import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  OAUTH_NEXT_COOKIE_NAME,
  resolveOAuthDestination,
} from "@/lib/security/oauth-destination";
import { buildCallbackSuccessHtml } from "./callback-success-html";

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
    // Collect every cookie the exchange produces instead of attaching them
    // to an intermediate redirect: the success response below is HTTP 200
    // HTML (not a 3xx), so no redirect layer can re-attach the OAuth query.
    // Types mirror NextResponse.cookies.set; verified by tsc at both ends.
    const pendingCookies: {
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
    }[] = [];

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
              // Normalize ssr cookie options to Next.js response-cookie shape.
              // sameSite is narrowed (ssr types permit boolean) — a
              // non-string value falls back to omitting the attribute.
              const sameSite =
                options.sameSite === "lax" ||
                options.sameSite === "strict" ||
                options.sameSite === "none"
                  ? options.sameSite
                  : undefined;
              pendingCookies.push({
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
          pendingCookies.push({ name: cookie.name, value: "", options: staleDeletionOptions });
        }
      }

      // Success: HTTP 200 HTML that navigates to the validated destination.
      // A 3xx is deliberately avoided: the Netlify redirect layer preserves
      // the incoming OAuth query string onto 3xx Locations, which previously
      // surfaced ?code= in the browser URL. HTML navigation carries no query.
      const response = new NextResponse(buildCallbackSuccessHtml(next), {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      });
      // Apply every cookie produced during the exchange (session chunks,
      // stale purges) to this single response so none are lost.
      for (const cookie of pendingCookies) {
        response.cookies.set(cookie.name, cookie.value, cookie.options);
      }
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
