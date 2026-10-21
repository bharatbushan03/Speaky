"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Progress, Skeleton } from "@/components/ui/progress";
import { Target, TrendingUp, Clock, Grid } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useSearchParams as useSupabaseSearchParams } from "@supabase/supabase-js";
import { useToast } from "@/components/ui/toast";
import Link from "next/link";

interface SessionHistoryFilters {
  mode: string;
  topic: string;
  status: string;
  start_date: string;
  end_date: string;
}

interface SessionHistoryEntry {
  id: string;
  mode: string;
  topic: string | null;
  status: string;
  question_count: number;
  started_at: string | null;
  completed_at: string | null;
  overall_score: number | null;
  date: string;
  duration: string;
}

export default function SessionHistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionHistoryEntry[]>([]);
  const [filters, setFilters] = useState<SessionHistoryFilters>({
    mode: "",
    topic: "",
    status: "",
    start_date: "",
    end_date: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabaseSearchParams = useSupabaseSearchParams();

  useEffect(() => {
    async function loadSessions() {
      setLoading(true);
      try {
        const url = "/api/v1/progress/history";
        const params = new URLSearchParams();

        if (filters.mode) params.append("mode", filters.mode);
        if (filters.topic) params.append("topic", filters.topic);
        if (filters.status) params.append("status", filters.status);
        if (filters.start_date) params.append("start_date", filters.start_date);
        if (filters.end_date) params.append("end_date", filters.end_date);

        const response = await fetch(`${url}?${params.toString()}`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to load session history");
        }

        const result = await response.json();
        setSessions(result);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load session history");
        setLoading(false);
      }
    }

    loadSessions();
  }, [filters.mode, filters.topic, filters.status, filters.start_date, filters.end_date]);

  const handleFilterChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value === "" ? undefined : value });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12">
        <div className="bg-red-50 rounded-border p-6 max-w-md">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
          <p className="text-red-600">{error}</p>
          <Button onClick={() => router.replace("/dashboard")}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Session History</h1>
          <p className="text-muted-foreground">
            Review your completed practice sessions and track your improvement
          </p>
        </div>

        {/* Filters Section */}
        <div className="card rounded-lg p-4 mb-8 shadow-sm">
          <form className="grid grid-cols-2 gap-4 max-w-2xl">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Practice Mode
              </label>
              <select
                name="mode"
                className="w-full rounded-border border-input px-3 py-2 focus:ring-2 focus:ring-primary focus:ring-offset-2"
                onChange={handleFilterChange}
                value={filters.mode}
              >
                <option value="">All modes</option>
                <option value="hr">HR Interview</option>
                <option value="technical">Technical Interview</option>
                <option value="viva">Academic Viva</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Topic
              </label>
              <input
                type="text"
                name="topic"
                placeholder="e.g. grammar, vocabulary, technical"
                className="w-full rounded-border border-input px-3 py-2 focus:ring-2 focus:ring-primary focus:ring-offset-2"
                onChange={handleFilterChange}
                value={filters.topic || ""}
                disabled={true}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Filter by topic focus is not yet available in the API
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Status
              </label>
              <select
                name="status"
                className="w-full rounded-border border-input px-3 py-2 focus:ring-2 focus:ring-primary focus:ring-offset-2"
                onChange={handleFilterChange}
                value={filters.status}
              >
                <option value="">All statuses</option>
                <option value="completed">Completed</option>
                <option value="in_progress">In Progress</option>
                <option value="created">Created</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Date Range
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  name="start_date"
                  className="w-full rounded-border border-input px-3 py-2 focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  onChange={handleFilterChange}
                  value={filters.start_date || ""}
                />
                <input
                  type="date"
                  name="end_date"
                  className="w-full rounded-border border-input px-3 py-2 focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  onChange={handleFilterChange}
                  value={filters.end_date || ""}
                />
              </div>
            </div>
          </form>
        </div>

        {/* Sessions List */}
        <Card>
          <CardHeader>
            <CardTitle>Your Practice Sessions</CardTitle>
            <CardDescription>
              {sessions.length} session{s}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <EmptyState
                icon={Target}
                title="No sessions found"
                description="Start your first practice session to track your progress"
                actionLabel="Start Practicing"
                actionHref="/practice"
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border-muted">
                  <thead>
                    <tr className="text-muted-foreground text-xs uppercase">
                      <th className="text-left">Date</th>
                      <th className="text-left">Mode</th>
                      <th className="text-left">Topic</th>
                      <th className="text-center">Questions</th>
                      <th className="text-right">Score</th>
                      <th className="text-right">Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session, index) => (
                      <tr key={index} className="hover:bg-muted/50 transition-colors">
                        <td className="font-medium text-sm">
                          {session.date}
                        </td>
                        <td>
                          <Badge variant="outline" className="text-xs">
                            {session.mode}
                          </Badge>
                        </td>
                        <td className="text-sm truncate">
                          {session.topic || "-"}
                        </td>
                        <td className="text-center text-sm">
                          {session.question_count}
                        </td>
                        <td className="text-right">
                          {session.overall_score !== null ? (
                            <div className={cn(
                              "font-medium",
                              session.overall_score >= 80 ? "text-green-600" : session.overall_score >= 60 ? "text-yellow-600" : "text-red-600"
                            )}>
                              {session.overall_score}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="text-right text-sm">
                          {session.duration}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination section - placeholder for future implementation */}
        {/* TODO: Add pagination when API supports it */}
        {/* 
        <div className="mt-8">
          <Button
            variant="outline"
            size="sm"
            disabled={true}
          >
            Load More
          </Button>
        </div>
        */}
      </div>
    </div>
  );
}