import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

export function getSupabaseConfigurationError(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return "Sign-in is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then restart the frontend.";
  }
  try {
    const parsed = new URL(url);
    const isLocalDevelopment = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    if (parsed.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && isLocalDevelopment)) throw new Error();
  } catch {
    return "NEXT_PUBLIC_SUPABASE_URL must be a valid Supabase project URL. Update it and restart the frontend.";
  }
  return null;
}

export function getSupabaseClient(): SupabaseClient {
  const configurationError = getSupabaseConfigurationError();
  if (configurationError) throw new Error(configurationError);
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}

// Preserve existing `supabase.auth` / `supabase.from` imports without creating
// the browser client (or throwing for missing env) during module evaluation.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    const instance = getSupabaseClient();
    const value = Reflect.get(instance, property, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

// Database types will be generated based on actual schema
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          created_at?: string;
        };
      };
      practice_sessions: {
        Row: {
          id: string;
          user_id: string;
          session_type: string;
          score: number | null;
          feedback: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_type: string;
          score?: number | null;
          feedback?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          session_type?: string;
          score?: number | null;
          feedback?: string | null;
          created_at?: string;
        };
      };
    };
  };
};
