"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Target } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { getAPIErrorMessage } from "@/lib/api-client";
import { sessionsAPI, SessionHistoryFilters, SessionHistoryItem } from "@/lib/api/sessions";

const DEFAULT_FILTERS: SessionHistoryFilters = {
  mode: null,
  topic: null,
  status: null,
  start_date: null,
  end_date: null,
  limit: 20,
  offset: 0,
};

function formatDuration(minutes: number | null | undefined) {
  if (!minutes || minutes < 1) return "—";
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function scoreClass(score: number | null) {
  if (score === null) return "text-muted-foreground";
  if (score >= 8) return "text-green-600";
  if (score >= 6) return "text-yellow-600";
  return "text-red-600";
}

export default function SessionHistoryPage() {
  const [filters, setFilters] = useState<SessionHistoryFilters>(DEFAULT_FILTERS);
  const [sessions, setSessions] = useState<SessionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    sessionsAPI.getSessionHistory(filters)
      .then((result) => {
        if (!controller.signal.aborted) setSessions(Array.isArray(result) ? result : []);
      })
      .catch((caught) => {
        if (!controller.signal.aborted) setError(getAPIErrorMessage(caught));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filters]);

  const updateFilter = (key: keyof SessionHistoryFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value || null, offset: 0 }));
  };

  if (loading) return <div className="container mx-auto space-y-4 px-4 py-8" role="status"><div className="h-8 w-64 animate-pulse rounded bg-muted" /><div className="h-64 animate-pulse rounded bg-muted" /></div>;

  if (error) {
    return (
      <div className="container mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
        <Target className="h-10 w-10 text-destructive" />
        <h1 className="text-xl font-semibold">Unable to load session history</h1>
        <p role="alert" className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={() => setFilters((current) => ({ ...current }))}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto space-y-6 px-4 py-8">
        <header>
          <h1 className="mb-2 text-3xl font-bold md:text-4xl">Session History</h1>
          <p className="text-muted-foreground">Review saved practice sessions and open a completed coaching report.</p>
        </header>

        <Card>
          <CardHeader><CardTitle className="text-lg">Filter sessions</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <label className="space-y-1 text-sm font-medium">Mode
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 font-normal" value={filters.mode || ""} onChange={(event) => updateFilter("mode", event.target.value)}>
                <option value="">All modes</option><option value="hr">HR interview</option><option value="technical">Technical interview</option><option value="viva">Academic viva</option>
              </select>
            </label>
            <label className="space-y-1 text-sm font-medium">Topic focus
              <input className="h-10 w-full rounded-md border border-input bg-background px-3 font-normal" value={filters.topic || ""} onChange={(event) => updateFilter("topic", event.target.value)} placeholder="Search topic" />
            </label>
            <label className="space-y-1 text-sm font-medium">Status
              <select className="h-10 w-full rounded-md border border-input bg-background px-3 font-normal" value={filters.status || ""} onChange={(event) => updateFilter("status", event.target.value)}>
                <option value="">All statuses</option><option value="completed">Completed</option><option value="in_progress">In progress</option><option value="created">Created</option><option value="cancelled">Cancelled</option>
              </select>
            </label>
            <label className="space-y-1 text-sm font-medium">From
              <input type="date" className="h-10 w-full rounded-md border border-input bg-background px-3 font-normal" value={filters.start_date || ""} onChange={(event) => updateFilter("start_date", event.target.value)} />
            </label>
            <label className="space-y-1 text-sm font-medium">To
              <input type="date" className="h-10 w-full rounded-md border border-input bg-background px-3 font-normal" value={filters.end_date || ""} onChange={(event) => updateFilter("end_date", event.target.value)} />
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Your Practice Sessions</CardTitle><CardDescription>{sessions.length} session{sessions.length === 1 ? "" : "s"} on this page</CardDescription></CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <EmptyState icon={Target} title="No sessions found" description="Start a practice session or adjust your filters." actionLabel="Start practicing" actionHref="/practice" />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead><tr className="text-left text-xs uppercase text-muted-foreground"><th className="px-3 py-3">Date</th><th className="px-3 py-3">Mode</th><th className="px-3 py-3">Topic</th><th className="px-3 py-3 text-center">Questions</th><th className="px-3 py-3 text-right">Score</th><th className="px-3 py-3 text-right">Duration</th><th className="px-3 py-3 text-right">Report</th></tr></thead>
                  <tbody className="divide-y divide-border">
                    {sessions.map((session) => (
                      <tr key={session.session_id} className="hover:bg-muted/50">
                        <td className="whitespace-nowrap px-3 py-3">{session.date}</td>
                        <td className="px-3 py-3"><Badge variant="outline" className="capitalize">{session.mode}</Badge></td>
                        <td className="max-w-[220px] truncate px-3 py-3">{session.topic || "—"}</td>
                        <td className="px-3 py-3 text-center">{session.question_count}</td>
                        <td className={`px-3 py-3 text-right font-semibold ${scoreClass(session.overall_score)}`}>{session.overall_score === null ? "—" : `${session.overall_score.toFixed(1)} / 10`}</td>
                        <td className="px-3 py-3 text-right">{formatDuration(session.duration_minutes)}</td>
                        <td className="px-3 py-3 text-right"><Button asChild size="sm" variant="ghost"><Link href={`/session-report/${encodeURIComponent(session.session_id)}`}>{session.status === "completed" ? "Report" : "Open"}</Link></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-6 flex justify-end">
              <Button variant="outline" disabled={filters.offset === 0 || loading} onClick={() => setFilters((current) => ({ ...current, offset: Math.max(0, current.offset - current.limit) }))}>Previous</Button>
              <Button variant="outline" className="ml-2" disabled={sessions.length < filters.limit || loading} onClick={() => setFilters((current) => ({ ...current, offset: current.offset + current.limit }))}>Next</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
