import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSafeRedirectUrl } from "@/lib/security/safe-redirect";

const ALLOWED_REDIRECT_PREFIXES = [
  "/",
  "/about",
  "/settings",
  "/discussions",
  "/debates",
  "/search",
  "/u/",
  "/friends",
  "/saved",
  "/login",
  "/register",
  "/auth/attest-age",
] as const;

function getAllowedRedirect(target: string | null, fallback = "/"): string {
  const safe = getSafeRedirectUrl(target, fallback);
  if (safe === fallback) return fallback;
  const isAllowed = ALLOWED_REDIRECT_PREFIXES.some((prefix) => safe.startsWith(prefix));
  return isAllowed ? safe : fallback;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const target = requestUrl.searchParams.get("next") || requestUrl.searchParams.get("redirectedFrom");
  const next = getAllowedRedirect(target, "/");

  if (code) {
    const response = NextResponse.redirect(new URL(next, requestUrl.origin));

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
              response.cookies.set(name, value, options);
            });
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return response;
    }
  }

  return NextResponse.redirect(new URL("/login?authError=verification", requestUrl.origin));
}
