import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function getSafeRedirect(path: string | null) {
  if (!path) return "/login";

  if (path.startsWith("//")) return "/";

  const allowedPrefixes = ["/settings", "/discussions", "/search", "/u/", "/login"];

  return allowedPrefixes.some((prefix) => path.startsWith(prefix)) ? path : "/";
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = getSafeRedirect(requestUrl.searchParams.get("next"));

  if (code) {
    // Create the redirect response BEFORE exchanging the code
    // so that setAll() writes cookies onto it
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
