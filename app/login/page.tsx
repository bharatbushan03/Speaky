"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Provider } from "@supabase/supabase-js";
import Link from "next/link";
import { Mic, ArrowLeft, Loader2, Sparkles, Mail, Lock, CheckCircle2 } from "lucide-react";
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
      if (oauthError) {
        setError("That sign-in provider is unavailable. Enable it in Supabase, then try again.");
      }
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
        if (resetError) {
          setError("Unable to send a reset email. Check the address and try again.");
        } else {
          setNotice("If that account exists, a password reset email is on its way.");
        }
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
          const callback = `${window.location.origin}/auth/callback`;
          setNotice(
            `Check your email to confirm the account. The link must return to ${callback}. If it opens the live site, add that local address in Supabase under Authentication, URL Configuration, Redirect URLs.`
          );
          setMode("sign-in");
          setPassword("");
          return;
        }
      } else {
        const { data, error: signInError } = await client.auth.signInWithPassword({
          email: trimmed,
          password,
        });
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
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-12 bg-gradient-to-b from-background via-muted/10 to-background">
      <div className="w-full max-w-md space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Mic className="h-6 w-6" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight">Speaky</span>
          </Link>
          <p className="text-xs text-muted-foreground">
            AI-powered coaching for interview mastery & English speaking fluency
          </p>
        </div>

        <Card className="border shadow-lg">
          <CardHeader className="space-y-3 pb-4">
            {/* Mode switch tabs */}
            {mode !== "reset" ? (
              <div className="grid grid-cols-2 rounded-lg bg-muted p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setMode("sign-in");
                    setError(null);
                    setNotice(null);
                  }}
                  className={`py-1.5 rounded-md transition-all ${
                    mode === "sign-in"
                      ? "bg-background text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("sign-up");
                    setError(null);
                    setNotice(null);
                  }}
                  className={`py-1.5 rounded-md transition-all ${
                    mode === "sign-up"
                      ? "bg-background text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Create Account
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">Reset Password</CardTitle>
                <button
                  type="button"
                  onClick={() => {
                    setMode("sign-in");
                    setError(null);
                    setNotice(null);
                  }}
                  className="text-xs text-primary hover:underline flex items-center"
                >
                  <ArrowLeft className="h-3 w-3 mr-1" /> Back to Sign In
                </button>
              </div>
            )}

            <CardDescription className="text-xs">
              {mode === "sign-in"
                ? "Sign in to access your saved sessions, scores, and coaching reports."
                : mode === "sign-up"
                ? "Create a free account to track your speaking progress over time."
                : "Enter your email address and we'll send you a password reset link."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {configError && (
              <p role="alert" className="text-xs rounded-md bg-destructive/10 p-3 text-destructive font-medium">
                {configError}
              </p>
            )}

            {/* Social Logins */}
            {mode !== "reset" && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy || !!configError}
                    onClick={() => void oauth("google")}
                    className="text-xs h-10 font-medium"
                  >
                    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Google
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy || !!configError}
                    onClick={() => void oauth("github")}
                    className="text-xs h-10 font-medium"
                  >
                    <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      />
                    </svg>
                    GitHub
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-[11px] uppercase">
                    <span className="bg-card px-2 text-muted-foreground font-medium">Or continue with email</span>
                  </div>
                </div>
              </>
            )}

            {/* Email / Password Form */}
            <form onSubmit={onSubmit} className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={busy || !!configError}
                    className="pl-9 h-10 text-sm"
                  />
                </div>
              </div>

              {mode !== "reset" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs">
                      Password
                    </Label>
                    {mode === "sign-in" && (
                      <button
                        type="button"
                        className="text-[11px] text-primary hover:underline"
                        onClick={() => {
                          setMode("reset");
                          setError(null);
                          setNotice(null);
                        }}
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={busy || !!configError}
                      className="pl-9 h-10 text-sm"
                    />
                  </div>
                  {mode === "sign-up" && (
                    <p className="text-[11px] text-muted-foreground">
                      Must be at least 6 characters.
                    </p>
                  )}
                </div>
              )}

              {error && (
                <p role="alert" className="text-xs rounded-md bg-destructive/10 p-3 text-destructive font-medium">
                  {error}
                </p>
              )}

              {notice && (
                <div role="status" className="flex items-start gap-2 text-xs rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{notice}</span>
                </div>
              )}

              <Button type="submit" className="w-full h-10 font-semibold shadow-sm" disabled={busy || !!configError}>
                {busy ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Please wait...
                  </span>
                ) : mode === "reset" ? (
                  "Send Reset Link"
                ) : mode === "sign-up" ? (
                  "Create Free Account"
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Guest fallback note */}
        <p className="text-center text-xs text-muted-foreground">
          You can also{" "}
          <Link href="/practice" className="text-primary font-medium hover:underline">
            try practice sessions without signing in
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
