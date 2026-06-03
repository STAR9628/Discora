import type { NextRequest } from "next/server";
import { updateSupabaseSession } from "@/services/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSupabaseSession(request);
}

export const config = {
  matcher: ["/protected/:path*", "/settings/:path*"],
};
