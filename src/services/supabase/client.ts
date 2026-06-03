import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "@/services/supabase/config";

export function createBrowserSupabaseClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();

  return createClient(supabaseUrl, supabaseAnonKey);
}
