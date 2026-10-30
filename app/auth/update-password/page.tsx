"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupabaseClient, getSupabaseConfigurationError } from "@/lib/supabase";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const configurationError = getSupabaseConfigurationError();
    if (configurationError) {
      setError(configurationError);
      return;
    }
    let active = true;
    const opened = { current: false };
    const client = getSupabaseClient();
    const markReady = (hasSession: boolean) => {
      if (!active || !hasSession) return;
      opened.current = true;
      setReady(true);
    };
    const { data: listener } = client.auth.onAuthStateChange((_event, session) => markReady(!!session));
    client.auth.getSession().then(({ data }) => markReady(!!data.session)).catch(() => {
      if (active) setError("Unable to open the password reset link. Request a new one.");
    });
    const timer = window.setTimeout(() => {
      if (active && !opened.current) setError("This reset link is invalid or expired. Request a new one.");
    }, 8000);
    return () => {
      active = false;
      listener.subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { error: updateError } = await getSupabaseClient().auth.updateUser({ password });
      if (updateError) {
        setError("Unable to update the password. Use at least 6 characters and try again.");
        return;
      }
      router.replace("/dashboard");
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
          <CardTitle>Choose a new password</CardTitle>
          <CardDescription>This updates the password for your SpeakReady account.</CardDescription>
        </CardHeader>
        <CardContent>
          {!ready && !error && <p role="status">Checking the reset link...</p>}
          {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
          {ready && (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input id="new-password" type="password" autoComplete="new-password" required minLength={6}
                  value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "Saving..." : "Update password"}</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
