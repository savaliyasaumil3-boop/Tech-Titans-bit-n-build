import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Only create real client if credentials are provided
export const supabase =
  supabaseUrl && supabaseAnonKey && supabaseUrl !== "https://your-project.supabase.co"
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export const isDemoMode =
  process.env.NEXT_PUBLIC_DEMO_MODE === "true" || !supabase;
