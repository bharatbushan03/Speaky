"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient, getSupabaseConfigurationError } from "@/lib/supabase";
import { safeNextPath } from "@/components/auth/auth-provider";

const NEXT_KEY = "speakyAuthNext";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const configurationError = getSupabaseConfigurationError();
    if (configurationError) {
      setError(configurationError);
      return;
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") || params.get("error_description")) {
      setError("Sign-in was cancelled or failed. Try again.");
      return;
    }
    let finished = false;
    const client = getSupabaseClient();
    const finish = (hasSession: boolean) => {
      if (finished || !hasSession) return;
      finished = true;
      let next = "/dashboard";
      try {
        next = safeNextPath(sessionStorage.getItem(NEXT_KEY));
        sessionStorage.removeItem(NEXT_KEY);
      } catch {
        next = "/dashboard";
      }
      router.replace(next);
    };
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => finish(!!session));
    client.auth.getSession().then(({ data }) => finish(!!data.session)).catch(() => {
      if (!finished) setError("Unable to finish sign-in. Try again.");
    });
    const timer = window.setTimeout(() => {
      if (!finished) setError("Sign-in did not finish. Try again from the sign-in page.");
    }, 8000);
    return () => {
      listener.subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, [router]);

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      {error ? (
        <>
          <p role="alert" className="text-destructive">{error}</p>
          <button type="button" className="mt-4 text-sm text-primary hover:underline" onClick={() => router.replace("/login")}>
            Back to sign in
          </button>
        </>
      ) : (
        <p role="status">Finishing sign-in...</p>
      )}
    </div>
  );
}
