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

function serverEnv(name: string): string {
  return process.env[name]?.trim() || "";
}

export function getApiUrl(): string {
  return injected()?.apiUrl || "";
}

export function getSupabaseUrl(): string {
  return injected()?.supabaseUrl || "";
}

export function getSupabaseAnonKey(): string {
  return injected()?.supabaseAnonKey || "";
}

export function serverPublicConfig(): PublicRuntimeConfig {
  return {
    apiUrl: serverEnv("API_URL"),
    supabaseUrl: serverEnv("SUPABASE_URL"),
    supabaseAnonKey: serverEnv("SUPABASE_ANON_KEY"),
  };
}

export function serializePublicConfig(config: PublicRuntimeConfig): string {
  return JSON.stringify(config).replace(/</g, "\\u003c");
}
