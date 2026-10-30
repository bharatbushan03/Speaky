"use client";

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Session } from "@supabase/supabase-js";
import { getSupabaseClient, getSupabaseConfigurationError } from "@/lib/supabase";

const PUBLIC_PATHS = ["/", "/login", "/auth/callback", "/auth/update-password"];

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  configError: string | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

export function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/login")) {
    return "/dashboard";
  }
  return value;
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    const configurationError = getSupabaseConfigurationError();
    if (configurationError) {
      setConfigError(configurationError);
      setLoading(false);
      return;
    }
    let active = true;
    const client = getSupabaseClient();
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setLoading(false);
    });
    client.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    }).catch(() => {
      if (!active) return;
      setSession(null);
      setLoading(false);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const returnPath = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
  const blocked = !configError && !isPublicPath(pathname) && (loading || !session);

  useEffect(() => {
    if (loading || configError || session || isPublicPath(pathname)) return;
    router.replace(`/login?next=${encodeURIComponent(returnPath)}`);
  }, [configError, loading, pathname, returnPath, router, session]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    loading,
    configError,
    signOut: async () => {
      if (!getSupabaseConfigurationError()) {
        await getSupabaseClient().auth.signOut();
      }
      setSession(null);
      router.replace("/");
    },
  }), [configError, loading, router, session]);

  return (
    <AuthContext.Provider value={value}>
      {configError && !isPublicPath(pathname) ? (
        <p role="alert" className="mx-auto max-w-lg p-8 text-center text-destructive">{configError}</p>
      ) : blocked ? (
        <p role="status" className="p-8 text-center">Checking sign-in...</p>
      ) : children}
    </AuthContext.Provider>
  );
}
