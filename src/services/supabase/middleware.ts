import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseConfig } from "@/services/supabase/config";

function createRedirectResponse(redirectUrl: URL | string, sourceResponse: NextResponse): NextResponse {
  const redirectResponse = NextResponse.redirect(redirectUrl);
  sourceResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
  });
  return redirectResponse;
}

function createRewriteResponse(rewriteUrl: URL | string, sourceResponse: NextResponse): NextResponse {
  const rewriteResponse = NextResponse.rewrite(rewriteUrl);
  sourceResponse.cookies.getAll().forEach((cookie) => {
    rewriteResponse.cookies.set(cookie.name, cookie.value, cookie);
  });
  return rewriteResponse;
}

export async function updateSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  if (!hasSupabaseConfig()) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isAdminPath = pathname.startsWith("/admin");

  if (isAdminPath) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("redirectedFrom", pathname);
      return createRedirectResponse(redirectUrl, response);
    }

    const ownerId = process.env.DISCORA_OWNER_USER_ID?.trim();
    if (!ownerId || user.id !== ownerId) {
      // Rewrite unauthorized requests to 404
      return createRewriteResponse(new URL("/404", request.url), response);
    }
  }

  const isProtectedPath =
    pathname.startsWith("/protected") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/discussions/create") ||
    pathname.startsWith("/debates/create");

  if (!user && isProtectedPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectedFrom", pathname);

    return createRedirectResponse(redirectUrl, response);
  }

  // First-visit guest experience: route brand-new visitors to /about
  if (pathname === "/" && !user && !request.cookies.get("discora_visited")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/about";
    const redirectResponse = NextResponse.redirect(redirectUrl);
    redirectResponse.cookies.set("discora_visited", "true", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return redirectResponse;
  }

  // Ensure discora_visited cookie is set when visiting /about
  if (pathname === "/about" && !request.cookies.get("discora_visited")) {
    response.cookies.set("discora_visited", "true", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  // Age eligibility gate for OAuth users
  if (user && !pathname.startsWith("/auth/") && !pathname.startsWith("/login") && !pathname.startsWith("/register") && !pathname.startsWith("/api/") && !pathname.startsWith("/_next/") && pathname !== "/favicon.ico") {
    const skipAgeGate =
      pathname.startsWith("/auth/attest-age") ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/register") ||
      pathname.startsWith("/api/") ||
      pathname.startsWith("/_next/") ||
      pathname === "/favicon.ico" ||
      pathname.startsWith("/about");

    if (!skipAgeGate) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, is_deleted, age_confirmed")
        .eq("id", user.id)
        .maybeSingle();

      // Check if this is an OAuth user (has google provider but no email provider)
      const providers = user.app_metadata?.providers ?? [];
      const isOAuthUser = providers.includes("google") && !providers.includes("email");

      if (profile) {
        if (profile.is_deleted) {
          // Fail-closed gate: invalidate sessions and redirect to /
          const redirectUrl = request.nextUrl.clone();
          redirectUrl.pathname = "/";
          const redirectResponse = NextResponse.redirect(redirectUrl);
          const allCookies = request.cookies.getAll();
          for (const c of allCookies) {
            if (c.name.includes("auth-token") || c.name.startsWith("sb-")) {
              redirectResponse.cookies.delete(c.name);
            }
          }
          return redirectResponse;
        }

        // Age gate for OAuth users who haven't confirmed 18+
        if (isOAuthUser && !profile.age_confirmed) {
          const redirectUrl = request.nextUrl.clone();
          redirectUrl.pathname = "/auth/attest-age";
          redirectUrl.searchParams.set("redirectTo", pathname);
          return createRedirectResponse(redirectUrl, response);
        }
      } else if (isOAuthUser) {
        // OAuth user without profile - they need to create profile first, then attest
        // The profile creation will set age_confirmed = false, then middleware will catch them
        // on next request and redirect to attest-age.
        // For now, allow them to proceed to /settings/profile to create profile.
        // The profile form will set age_confirmed = false for OAuth users.
      }
    }
  }

  // Redirect new users without a profile to the profile setup page
  if (user && !pathname.startsWith("/settings")) {
    const skipProfileCheck =
      pathname.startsWith("/login") ||
      pathname.startsWith("/register") ||
      pathname.startsWith("/auth/") ||
      pathname.startsWith("/api/") ||
      pathname.startsWith("/_next/") ||
      pathname === "/favicon.ico" ||
      pathname.startsWith("/about");

    if (!skipProfileCheck) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, is_deleted")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/settings/profile";
        return createRedirectResponse(redirectUrl, response);
      }

      if (profile.is_deleted) {
        // Fail-closed gate: invalidate sessions and redirect to /
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/";
        const redirectResponse = NextResponse.redirect(redirectUrl);
        const allCookies = request.cookies.getAll();
        for (const c of allCookies) {
          if (c.name.includes("auth-token") || c.name.startsWith("sb-")) {
            redirectResponse.cookies.delete(c.name);
          }
        }
        return redirectResponse;
      }
    }
  }

  return response;
}
