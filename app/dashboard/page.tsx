"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Clock, Flame, Target, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCard } from "@/components/dashboard/stats-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { getAPIErrorMessage } from "@/lib/api-client";
import { sessionsAPI, SessionHistoryItem } from "@/lib/api/sessions";

interface DashboardData {
  totalSessions: number;
  averageScore: number | null;
  grammarScore: number | null;
  vocabularyScore: number | null;
  fluencyScore: number | null;
  currentStreak: number;
  longestStreak: number;
  recentSessions: SessionHistoryItem[];
}

function LoadingState() {
  return (
    <div className="container mx-auto space-y-6 px-4 py-8" role="status">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32" />)}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

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

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summary, recentSessions] = await Promise.all([
        sessionsAPI.getProgressSummary(),
        sessionsAPI.getSessionHistory({ limit: 5, offset: 0 }),
      ]);
      setData({
        totalSessions: summary.total_sessions,
        averageScore: summary.average_score,
        grammarScore: summary.grammar_score,
        vocabularyScore: summary.vocabulary_score,
        fluencyScore: summary.fluency_score,
        currentStreak: summary.current_streak,
        longestStreak: summary.longest_streak,
        recentSessions,
      });
    } catch (caught) {
      setError(getAPIErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  if (loading) return <LoadingState />;
  if (error) {
    return (
      <div className="container mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
        <Target className="h-10 w-10 text-destructive" />
        <h1 className="text-xl font-semibold">Unable to load your progress</h1>
        <p role="alert" className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={() => void loadDashboard()}>Try again</Button>
      </div>
    );
  }
  if (!data) return null;

  const practiceMinutes = data.recentSessions.reduce((total, session) => total + (session.duration_minutes || 0), 0);
  const averagePercentage = data.averageScore === null ? 0 : data.averageScore * 10;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto space-y-8 px-4 py-8">
        <header>
          <h1 className="mb-2 text-3xl font-bold md:text-4xl">Welcome back! 👋</h1>
          <p className="text-muted-foreground">Track your progress and continue your journey to confident communication.</p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard title="Total Sessions" value={data.totalSessions} description="Completed practice" icon={Target} />
          <StatsCard title="Average Score" value={data.averageScore === null ? "—" : `${data.averageScore.toFixed(1)} / 10`} description="Across evaluated sessions" icon={TrendingUp} />
          <StatsCard title="Current Streak" value={`${data.currentStreak} days`} description={`Longest: ${data.longestStreak} days`} icon={Flame} />
          <StatsCard title="Practice Time" value={formatDuration(practiceMinutes)} description="Recent sessions" icon={Clock} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Communication Score</CardTitle><CardDescription>Scores use a consistent 0–10 scale.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className={`text-4xl font-bold ${scoreClass(data.averageScore)}`}>{data.averageScore === null ? "—" : data.averageScore.toFixed(1)}</div>
              <Progress value={averagePercentage} aria-label="Average communication score" />
              <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                <span>Grammar: {data.grammarScore === null ? "—" : `${data.grammarScore.toFixed(1)} / 10`}</span>
                <span>Vocabulary: {data.vocabularyScore === null ? "—" : `${data.vocabularyScore.toFixed(1)} / 10`}</span>
                <span>Fluency: {data.fluencyScore === null ? "—" : `${data.fluencyScore.toFixed(1)} / 10`}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Keep improving</CardTitle><CardDescription>Use your latest scores to choose the next practice.</CardDescription></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {data.averageScore === null ? (
                <p className="text-muted-foreground">Complete a session to receive personalized progress data.</p>
              ) : (
                <>
                  {data.grammarScore !== null && data.grammarScore < 7 && <p>Review grammar patterns in your next answer.</p>}
                  {data.vocabularyScore !== null && data.vocabularyScore < 7 && <p>Use specific topic vocabulary and concrete examples.</p>}
                  {data.fluencyScore !== null && data.fluencyScore < 7 && <p>Try voice practice to work on pacing and fluency.</p>}
                  {data.averageScore >= 7 && <p>Strong progress. Try a harder session or a new practice mode.</p>}
                </>
              )}
              <Button asChild variant="outline"><Link href="/practice"><BookOpen className="mr-2 h-4 w-4" />Start practice</Link></Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div><CardTitle>Recent Sessions</CardTitle><CardDescription>Your latest saved practice sessions.</CardDescription></div>
            <Button asChild variant="outline" size="sm"><Link href="/session-history">View all</Link></Button>
          </CardHeader>
          <CardContent>
            {data.recentSessions.length === 0 ? (
              <EmptyState icon={Target} title="No sessions yet" description="Start practicing to see your progress here." actionLabel="Start practice" actionHref="/practice" />
            ) : (
              <div className="space-y-3">
                {data.recentSessions.map((session) => (
                  <Link key={session.session_id} href={`/session-report/${encodeURIComponent(session.session_id)}`} className="flex items-center justify-between gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50">
                    <div className="min-w-0">
                      <p className="font-semibold capitalize">{session.mode} practice</p>
                      <p className="truncate text-sm text-muted-foreground">{session.topic || "No topic focus"} · {session.question_count} questions · {session.date}</p>
                    </div>
                    <div className="shrink-0 text-right"><p className={`text-xl font-bold ${scoreClass(session.overall_score)}`}>{session.overall_score === null ? "—" : session.overall_score.toFixed(1)}</p><p className="text-xs text-muted-foreground">{formatDuration(session.duration_minutes)}</p></div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
