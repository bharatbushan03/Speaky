"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Provider } from "@supabase/supabase-js";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { safeNextPath, useAuth } from "@/components/auth/auth-provider";
import { getSupabaseClient } from "@/lib/supabase";

const NEXT_KEY = "speakyAuthNext";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, loading, configError } = useAuth();
  const nextPath = safeNextPath(searchParams.get("next"));
  const [mode, setMode] = useState<"sign-in" | "sign-up" | "reset">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session) router.replace(nextPath);
  }, [loading, nextPath, router, session]);

  const oauth = async (provider: Provider) => {
    setError(null);
    setBusy(true);
    try {
      sessionStorage.setItem(NEXT_KEY, nextPath);
      const { error: oauthError } = await getSupabaseClient().auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (oauthError) setError("That sign-in provider is unavailable. Enable it in Supabase, then try again.");
    } catch {
      setError("Unable to reach sign-in. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const client = getSupabaseClient();
    const trimmed = email.trim();
    try {
      if (mode === "reset") {
        const { error: resetError } = await client.auth.resetPasswordForEmail(trimmed, {
          redirectTo: `${window.location.origin}/auth/update-password`,
        });
        if (resetError) setError("Unable to send a reset email. Check the address and try again.");
        else setNotice("If that account exists, a password reset email is on its way.");
        return;
      }
      if (mode === "sign-up") {
        const { data, error: signUpError } = await client.auth.signUp({
          email: trimmed,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (signUpError) {
          setError("Unable to create the account. Use a valid email and a password of at least 6 characters.");
          return;
        }
        if (!data.session) {
          setNotice("Check your email to confirm the account, then sign in.");
          setMode("sign-in");
          setPassword("");
          return;
        }
      } else {
        const { data, error: signInError } = await client.auth.signInWithPassword({ email: trimmed, password });
        if (signInError || !data.session) {
          setError("Unable to sign in. Check your email and password, then try again.");
          return;
        }
      }
      router.replace(nextPath);
    } catch {
      setError("Unable to reach sign-in. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{mode === "reset" ? "Reset password" : mode === "sign-up" ? "Create account" : "Sign in"}</CardTitle>
          <CardDescription>Save practice sessions, scores, and coaching reports to your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {configError && <p role="alert" className="text-sm text-destructive">{configError}</p>}
          {mode !== "reset" && (
            <div className="grid gap-2">
              <Button type="button" variant="outline" disabled={busy || !!configError} onClick={() => void oauth("google")}>
                Continue with Google
              </Button>
              <Button type="button" variant="outline" disabled={busy || !!configError} onClick={() => void oauth("github")}>
                Continue with GitHub
              </Button>
            </div>
          )}
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" required value={email}
                onChange={(event) => setEmail(event.target.value)} disabled={busy || !!configError} />
            </div>
            {mode !== "reset" && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                  required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)}
                  disabled={busy || !!configError} />
              </div>
            )}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
            <Button type="submit" className="w-full" disabled={busy || !!configError}>
              {busy ? "Please wait..." : mode === "reset" ? "Send reset email" : mode === "sign-up" ? "Create account" : "Sign in"}
            </Button>
          </form>
          <div className="flex flex-col gap-2 text-sm">
            {mode === "sign-in" && (
              <>
                <button type="button" className="text-left text-primary hover:underline" onClick={() => { setMode("sign-up"); setError(null); setNotice(null); }}>
                  Need an account? Create one
                </button>
                <button type="button" className="text-left text-primary hover:underline" onClick={() => { setMode("reset"); setError(null); setNotice(null); }}>
                  Forgot password?
                </button>
              </>
            )}
            {mode !== "sign-in" && (
              <button type="button" className="text-left text-primary hover:underline" onClick={() => { setMode("sign-in"); setError(null); setNotice(null); }}>
                Already have an account? Sign in
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p role="status" className="p-8 text-center">Loading sign-in...</p>}>
      <LoginForm />
    </Suspense>
  );
}
