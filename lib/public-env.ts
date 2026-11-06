export type PublicRuntimeConfig = {
  apiUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
};

declare global {
  interface Window {
    __SPEAKREADY__?: Partial<PublicRuntimeConfig>;
  }
}

function injected(): Partial<PublicRuntimeConfig> | undefined {
  if (typeof window === "undefined") return undefined;
  return window.__SPEAKREADY__;
}

export function getApiUrl(): string {
  return injected()?.apiUrl || process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "";
}

export function getSupabaseUrl(): string {
  return injected()?.supabaseUrl || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
}

export function getSupabaseAnonKey(): string {
  return (
    injected()?.supabaseAnonKey ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  );
}

export function serverPublicConfig(): PublicRuntimeConfig {
  return {
    apiUrl: process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "",
    supabaseUrl: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  };
}

export function serializePublicConfig(config: PublicRuntimeConfig): string {
  return JSON.stringify(config).replace(/</g, "\\u003c");
}
