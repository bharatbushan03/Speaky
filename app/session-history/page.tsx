"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Target,
  Globe,
  Briefcase,
  Code,
  GraduationCap,
  Calendar,
  Clock,
  ArrowRight,
  Filter,
  RotateCcw,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { getAPIErrorMessage } from "@/lib/api-client";
import { sessionsAPI, SessionHistoryFilters, SessionHistoryItem } from "@/lib/api/sessions";
import { getDisplayMode, getModeTitle, getModeBadgeClass } from "@/lib/types/practice";

const DEFAULT_FILTERS: SessionHistoryFilters = {
  mode: null,
  topic: null,
  status: null,
  start_date: null,
  end_date: null,
  limit: 20,
  offset: 0,
};

function sessionHref(session: SessionHistoryItem) {
  if (session.status === "in_progress" || session.status === "created") {
    return `/practice/room?session=${encodeURIComponent(session.session_id)}`;
  }
  return `/session-report/${encodeURIComponent(session.session_id)}`;
}

function formatDuration(minutes: number | null | undefined) {
  if (!minutes || minutes < 1) return "—";
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function scoreClass(score: number | null) {
  if (score === null) return "text-muted-foreground";
  if (score >= 8) return "text-emerald-600 font-bold";
  if (score >= 6) return "text-amber-600 font-bold";
  return "text-destructive font-bold";
}

function getModeIcon(mode: string) {
  switch (mode) {
    case "english":
      return <Globe className="h-3.5 w-3.5 text-blue-600" />;
    case "technical":
      return <Code className="h-3.5 w-3.5 text-purple-600" />;
    case "viva":
      return <GraduationCap className="h-3.5 w-3.5 text-emerald-600" />;
    case "hr":
    default:
      return <Briefcase className="h-3.5 w-3.5 text-indigo-600" />;
  }
}

export default function SessionHistoryPage() {
  const [filters, setFilters] = useState<SessionHistoryFilters>(DEFAULT_FILTERS);
  const [selectedTrackFilter, setSelectedTrackFilter] = useState<string>("");
  const [sessions, setSessions] = useState<SessionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    // Map UI track selection to backend filters
    const queryFilters: SessionHistoryFilters = {
      ...filters,
      mode: selectedTrackFilter === "english" ? "hr" : (selectedTrackFilter || null),
    };

    sessionsAPI
      .getSessionHistory(queryFilters)
      .then((result) => {
        if (!controller.signal.aborted) {
          let list = Array.isArray(result) ? result : [];
          // Client-side filter for english if specified
          if (selectedTrackFilter === "english") {
            list = list.filter((s) => getDisplayMode({ mode: s.mode, topic: s.topic }) === "english");
          } else if (selectedTrackFilter === "hr") {
            list = list.filter((s) => getDisplayMode({ mode: s.mode, topic: s.topic }) === "hr");
          }
          setSessions(list);
        }
      })
      .catch((caught) => {
        if (!controller.signal.aborted) setError(getAPIErrorMessage(caught));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filters, selectedTrackFilter]);

  const updateFilter = (key: keyof SessionHistoryFilters, value: string) => {
    setFilters((current) => ({ ...current, [key]: value || null, offset: 0 }));
  };

  const resetFilters = () => {
    setSelectedTrackFilter("");
    setFilters(DEFAULT_FILTERS);
  };

  if (loading && sessions.length === 0) {
    return (
      <div className="container mx-auto space-y-4 px-4 py-8" role="status">
        <div className="h-8 w-64 animate-pulse rounded-lg bg-muted" />
        <div className="h-28 animate-pulse rounded-xl bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (error && sessions.length === 0) {
    return (
      <div className="container mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
        <Target className="h-10 w-10 text-destructive" />
        <h1 className="text-xl font-semibold">Unable to load session history</h1>
        <p role="alert" className="text-sm text-muted-foreground">
          {error}
        </p>
        <Button onClick={() => setFilters((current) => ({ ...current }))}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background">
      <div className="container mx-auto space-y-6 px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold md:text-4xl tracking-tight">Session History</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Review completed sessions, scores, and coaching reports
            </p>
          </div>
          <Button asChild size="sm">
            <Link href="/practice">Start New Session</Link>
          </Button>
        </div>

        {/* Filter Card */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Filter Sessions</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="text-xs text-muted-foreground hover:text-foreground h-8 px-2"
            >
              <RotateCcw className="h-3 w-3 mr-1" /> Reset
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="space-y-1 text-xs font-medium">
              Practice Track
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                value={selectedTrackFilter}
                onChange={(event) => {
                  setSelectedTrackFilter(event.target.value);
                  setFilters((prev) => ({ ...prev, offset: 0 }));
                }}
              >
                <option value="">All tracks</option>
                <option value="english">English practice</option>
                <option value="hr">HR interview</option>
                <option value="technical">Technical interview</option>
                <option value="viva">Academic viva</option>
              </select>
            </label>

            <label className="space-y-1 text-xs font-medium">
              Topic or Role
              <input
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                value={filters.topic || ""}
                onChange={(event) => updateFilter("topic", event.target.value)}
                placeholder="Search topic or role"
              />
            </label>

            <label className="space-y-1 text-xs font-medium">
              Status
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                value={filters.status || ""}
                onChange={(event) => updateFilter("status", event.target.value)}
              >
                <option value="">All statuses</option>
                <option value="completed">Completed</option>
                <option value="in_progress">In progress</option>
                <option value="created">Created</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>

            <label className="space-y-1 text-xs font-medium">
              From Date
              <input
                type="date"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                value={filters.start_date || ""}
                onChange={(event) => updateFilter("start_date", event.target.value)}
              />
            </label>

            <label className="space-y-1 text-xs font-medium">
              To Date
              <input
                type="date"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                value={filters.end_date || ""}
                onChange={(event) => updateFilter("end_date", event.target.value)}
              />
            </label>
          </CardContent>
        </Card>

        {/* Sessions List */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recorded Sessions</CardTitle>
              <CardDescription>
                {sessions.length} {sessions.length === 1 ? "session" : "sessions"} found
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <EmptyState
                icon={Target}
                title="No matching sessions"
                description="Start a practice session or adjust your search filters."
                actionLabel="Start Practicing"
                actionHref="/practice"
              />
            ) : (
              <div>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-border text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase text-muted-foreground font-semibold">
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Track</th>
                        <th className="px-4 py-3">Topic / Focus</th>
                        <th className="px-4 py-3 text-center">Questions</th>
                        <th className="px-4 py-3 text-right">Score</th>
                        <th className="px-4 py-3 text-right">Duration</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sessions.map((session) => {
                        const displayMode = getDisplayMode({
                          mode: session.mode,
                          topic: session.topic,
                        });
                        const modeTitle = getModeTitle(displayMode);
                        const badgeClass = getModeBadgeClass(displayMode);

                        return (
                          <tr key={session.session_id} className="hover:bg-muted/40 transition-colors">
                            <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                              {session.date}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${badgeClass}`}
                              >
                                {getModeIcon(displayMode)}
                                {modeTitle}
                              </span>
                            </td>
                            <td className="max-w-[220px] truncate px-4 py-3 text-xs font-medium">
                              {session.topic || "General practice"}
                            </td>
                            <td className="px-4 py-3 text-center text-xs">
                              {session.question_count}
                            </td>
                            <td className={`px-4 py-3 text-right ${scoreClass(session.overall_score)}`}>
                              {session.overall_score === null ? "—" : `${session.overall_score.toFixed(1)} / 10`}
                            </td>
                            <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                              {formatDuration(session.duration_minutes)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button asChild size="sm" variant={session.status === "completed" ? "default" : "outline"} className="h-8 text-xs font-semibold">
                                <Link href={sessionHref(session)}>
                                  {session.status === "completed" ? "Report" : "Resume"}
                                </Link>
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards View */}
                <div className="md:hidden space-y-3">
                  {sessions.map((session) => {
                    const displayMode = getDisplayMode({
                      mode: session.mode,
                      topic: session.topic,
                    });
                    const modeTitle = getModeTitle(displayMode);
                    const badgeClass = getModeBadgeClass(displayMode);

                    return (
                      <Link
                        key={session.session_id}
                        href={sessionHref(session)}
                        className="block p-4 rounded-xl border bg-card hover:bg-muted/30 transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${badgeClass}`}>
                            {getModeIcon(displayMode)}
                            {modeTitle}
                          </span>
                          <span className={`text-base ${scoreClass(session.overall_score)}`}>
                            {session.overall_score === null ? "—" : `${session.overall_score.toFixed(1)}/10`}
                          </span>
                        </div>

                        <p className="font-semibold text-sm line-clamp-1">
                          {session.topic || "General practice"}
                        </p>

                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {session.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(session.duration_minutes)}
                          </span>
                          <span className="font-medium text-primary flex items-center">
                            {session.status === "completed" ? "View Report" : "Resume"}
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pagination */}
            <div className="mt-6 flex items-center justify-between border-t pt-4">
              <span className="text-xs text-muted-foreground">
                Showing up to {filters.limit} sessions
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filters.offset === 0 || loading}
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      offset: Math.max(0, current.offset - current.limit),
                    }))
                  }
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={sessions.length < filters.limit || loading}
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      offset: current.offset + current.limit,
                    }))
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
