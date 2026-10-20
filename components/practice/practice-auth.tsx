"use client";

import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { getSupabaseClient, getSupabaseConfigurationError } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function PracticeAuth({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [checking, setChecking] = useState(true);
  const [configurationError, setConfigurationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    const configError = getSupabaseConfigurationError();
    if (configError) {
      setConfigurationError(configError);
      setChecking(false);
      return;
    }
    let active = true;
    let authChanged = false;
    const client = getSupabaseClient();
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      authChanged = true;
      if (active) {
        setSession(nextSession);
        setChecking(false);
      }
    });
    client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active || authChanged) return;
      setSession(data.session);
      if (sessionError) setError("Unable to restore sign-in. Please sign in again.");
      setChecking(false);
    }).catch(() => {
      if (!active) return;
      setError("Unable to restore sign-in. Please sign in again.");
      setChecking(false);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (event: FormEvent) => {
    event.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setSigningIn(true);
    setError(null);
    try {
      const { data, error: signInError } = await getSupabaseClient().auth.signInWithPassword({
        email: email.trim(), password,
      });
      if (signInError || !data.session) {
        setError("Unable to sign in. Check your email and password, then try again.");
      } else {
        setSession(data.session);
        setPassword("");
      }
    } catch {
      setError("Unable to reach sign-in. Check your connection and try again.");
    } finally {
      busy.current = false;
      setSigningIn(false);
    }
  };

  if (checking) return <p role="status">Checking sign-in...</p>;
  if (configurationError) {
    return <p role="alert" className="rounded-lg border p-4 text-destructive">{configurationError}</p>;
  }
  if (session) {
    return <div key={session.user.id} className="space-y-4">
      <p className="text-sm text-muted-foreground">Signed in as {session.user.email || "your account"}.</p>
      {children}
    </div>;
  }
  return (
    <Card>
      <CardHeader><CardTitle>Sign in to practice</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={signIn} className="space-y-4">
          <p className="text-sm text-muted-foreground">Use your Supabase account to save and resume practice sessions.</p>
          <div className="space-y-2">
            <Label htmlFor="practice-email">Email</Label>
            <Input id="practice-email" type="email" autoComplete="username" required
              value={email} onChange={(event) => setEmail(event.target.value)} disabled={signingIn} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="practice-password">Password</Label>
            <Input id="practice-password" type="password" autoComplete="current-password" required
              value={password} onChange={(event) => setPassword(event.target.value)} disabled={signingIn} />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={signingIn}>{signingIn ? "Signing in..." : "Sign in"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
