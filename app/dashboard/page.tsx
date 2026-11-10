"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Clock,
  Flame,
  Target,
  TrendingUp,
  Globe,
  Briefcase,
  Code,
  GraduationCap,
  ArrowRight,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatsCard } from "@/components/dashboard/stats-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { getAPIErrorMessage } from "@/lib/api-client";
import { sessionsAPI, RecommendationItem, SessionHistoryItem } from "@/lib/api/sessions";
import { getDisplayMode, getModeTitle, getModeBadgeClass } from "@/lib/types/practice";

interface DashboardData {
  totalSessions: number;
  averageScore: number | null;
  grammarScore: number | null;
  vocabularyScore: number | null;
  fluencyScore: number | null;
  clarityScore: number | null;
  currentStreak: number;
  longestStreak: number;
  recentSessions: SessionHistoryItem[];
  activeSessions: SessionHistoryItem[];
  recommendations: RecommendationItem[];
  weeklyScore: number | null;
  previousWeekScore: number | null;
}

function practiceHref(href: string | null) {
  if (!href || !href.startsWith("/") || href.startsWith("//")) return "/practice";
  return href;
}

function LoadingState() {
  return (
    <div className="container mx-auto space-y-6 px-4 py-8" role="status">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
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
  if (score >= 8) return "text-emerald-600 font-bold";
  if (score >= 6) return "text-amber-600 font-bold";
  return "text-destructive font-bold";
}

function getModeIcon(mode: string) {
  switch (mode) {
    case "english":
      return <Globe className="h-4 w-4 text-blue-600" />;
    case "technical":
      return <Code className="h-4 w-4 text-purple-600" />;
    case "viva":
      return <GraduationCap className="h-4 w-4 text-emerald-600" />;
    case "hr":
    default:
      return <Briefcase className="h-4 w-4 text-indigo-600" />;
  }
}

const quickTracks = [
  {
    title: "English Practice",
    desc: "Fluency & Conversation",
    icon: Globe,
    href: "/practice/english",
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/40",
  },
  {
    title: "HR Interview",
    desc: "Behavioral & Leadership",
    icon: Briefcase,
    href: "/practice/hr",
    color: "text-indigo-600",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
  },
  {
    title: "Technical Interview",
    desc: "Systems & Architecture",
    icon: Code,
    href: "/practice/technical",
    color: "text-purple-600",
    bg: "bg-purple-50 dark:bg-purple-950/40",
  },
  {
    title: "Academic Viva",
    desc: "Thesis & Defense",
    icon: GraduationCap,
    href: "/practice/viva",
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
  },
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summary, recentSessions, activeSessions, createdSessions, recommendations, trends] = await Promise.all([
        sessionsAPI.getProgressSummary(),
        sessionsAPI.getSessionHistory({ limit: 5, offset: 0, status: "completed" }),
        sessionsAPI.getSessionHistory({ limit: 3, offset: 0, status: "in_progress" }),
        sessionsAPI.getSessionHistory({ limit: 3, offset: 0, status: "created" }),
        sessionsAPI.getPersonalizedRecommendations().catch(() => [] as RecommendationItem[]),
        sessionsAPI.getPerformanceTrends().catch(() => []),
      ]);
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - 6);
      const previousStart = new Date(weekStart);
      previousStart.setDate(weekStart.getDate() - 7);
      const iso = (value: Date) => {
        const month = String(value.getMonth() + 1).padStart(2, "0");
        const day = String(value.getDate()).padStart(2, "0");
        return `${value.getFullYear()}-${month}-${day}`;
      };
      const mean = (from: string, until: string) => {
        const scores = (Array.isArray(trends) ? trends : []).filter((point) => point.date >= from && point.date < until && point.score != null);
        if (!scores.length) return null;
        return scores.reduce((total, point) => total + (point.score || 0), 0) / scores.length;
      };
      const resumable = [
        ...(Array.isArray(activeSessions) ? activeSessions : []),
        ...(Array.isArray(createdSessions) ? createdSessions : []),
      ].slice(0, 3);
      setData({
        totalSessions: summary?.total_sessions ?? 0,
        averageScore: summary?.average_score ?? null,
        grammarScore: summary?.grammar_score ?? null,
        vocabularyScore: summary?.vocabulary_score ?? null,
        clarityScore: summary?.clarity_score ?? null,
        fluencyScore: summary?.fluency_score ?? null,
        weeklyScore: mean(iso(weekStart), iso(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1))),
        previousWeekScore: mean(iso(previousStart), iso(weekStart)),
        currentStreak: summary?.current_streak ?? 0,
        longestStreak: summary?.longest_streak ?? 0,
        recentSessions: Array.isArray(recentSessions) ? recentSessions : [],
        activeSessions: resumable,
        recommendations: Array.isArray(recommendations) ? recommendations : [],
      });
    } catch (caught) {
      setError(getAPIErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (loading) return <LoadingState />;
  if (error) {
    return (
      <div className="container mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
        <Target className="h-10 w-10 text-destructive" />
        <h1 className="text-xl font-semibold">Unable to load your progress</h1>
        <p role="alert" className="text-sm text-muted-foreground">
          {error}
        </p>
        <Button onClick={() => void loadDashboard()}>Try again</Button>
      </div>
    );
  }
  if (!data) return null;

  const practiceMinutes = (Array.isArray(data.recentSessions) ? data.recentSessions : []).reduce(
    (total, session) => total + (session.duration_minutes || 0),
    0
  );
  const averagePercentage = data.averageScore === null ? 0 : data.averageScore * 10;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background">
      <div className="container mx-auto space-y-8 px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold md:text-4xl tracking-tight">Your Progress Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Track communication performance, streak milestones, and interview reports
            </p>
          </div>
          <Button asChild size="lg" className="shadow-md font-semibold">
            <Link href="/practice">
              <Sparkles className="mr-2 h-4 w-4" /> Start New Practice
            </Link>
          </Button>
        </div>

        {data.activeSessions.length > 0 && (
          <Card className="border-primary/30 bg-primary/5 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Continue practice</CardTitle>
              <CardDescription>Pick up a session that is still in progress.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.activeSessions.map((session) => {
                const displayMode = getDisplayMode({ mode: session.mode, topic: session.topic });
                return (
                  <div key={session.session_id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold">{getModeTitle(displayMode)}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {session.topic || "General practice"} · question {session.question_count}
                      </p>
                    </div>
                    <Button asChild>
                      <Link href={`/practice/room?session=${encodeURIComponent(session.session_id)}`}>
                        Resume <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Quick Launch Cards */}
        <div className="space-y-3">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Quick Practice Tracks
          </span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickTracks.map((track) => (
              <Link key={track.title} href={track.href}>
                <div className="p-3.5 rounded-xl border bg-card/70 hover:bg-card hover:border-primary/50 transition-all shadow-xs flex items-center gap-3 group">
                  <div className={`p-2.5 rounded-lg ${track.bg} shrink-0`}>
                    <track.icon className={`h-5 w-5 ${track.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate text-foreground group-hover:text-primary transition-colors">
                      {track.title}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{track.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Sessions"
            value={data.totalSessions}
            description="Completed evaluations"
            icon={Target}
          />
          <StatsCard
            title="Average Score"
            value={data.averageScore === null ? "—" : `${data.averageScore.toFixed(1)} / 10`}
            description="Across evaluated sessions"
            icon={TrendingUp}
          />
          <StatsCard
            title="Current Streak"
            value={`${data.currentStreak} ${data.currentStreak === 1 ? "day" : "days"}`}
            description={`Personal best: ${data.longestStreak} days`}
            icon={Flame}
          />
          <StatsCard
            title="Practice Time"
            value={formatDuration(practiceMinutes)}
            description="Recent completed calls"
            icon={Clock}
          />
        </div>

        {/* Communication Score & Coaching Tips */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Communication Score Card */}
          <Card className="shadow-xs">
            <CardHeader>
              <CardTitle className="text-lg">Communication Skill Breakdown</CardTitle>
              <CardDescription>Based on your evaluated AI practice sessions (0–10 scale)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-xs uppercase font-medium text-muted-foreground">Overall Average</span>
                  <div className={`text-4xl font-extrabold ${scoreClass(data.averageScore)}`}>
                    {data.averageScore === null ? "—" : `${data.averageScore.toFixed(1)}`}
                    <span className="text-sm font-normal text-muted-foreground ml-1">/ 10</span>
                  </div>
                </div>
                {data.averageScore !== null && (
                  <Badge variant={data.averageScore >= 7.5 ? "default" : "secondary"}>
                    {data.averageScore >= 8 ? "Excellent" : data.averageScore >= 6 ? "Good Progress" : "Needs Practice"}
                  </Badge>
                )}
              </div>

              <Progress value={averagePercentage} aria-label="Average communication score" className="h-2.5" />

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-lg border bg-muted/20 text-center">
                  <span className="text-xs text-muted-foreground block mb-1">Grammar</span>
                  <span className={`text-base font-bold ${scoreClass(data.grammarScore)}`}>
                    {data.grammarScore === null ? "—" : `${data.grammarScore.toFixed(1)}`}
                  </span>
                </div>
                <div className="p-3 rounded-lg border bg-muted/20 text-center">
                  <span className="text-xs text-muted-foreground block mb-1">Vocabulary</span>
                  <span className={`text-base font-bold ${scoreClass(data.vocabularyScore)}`}>
                    {data.vocabularyScore === null ? "—" : `${data.vocabularyScore.toFixed(1)}`}
                  </span>
                </div>
                <div className="p-3 rounded-lg border bg-muted/20 text-center">
                  <span className="text-xs text-muted-foreground block mb-1">Clarity</span>
                  <span className={`text-base font-bold ${scoreClass(data.clarityScore)}`}>
                    {data.clarityScore === null ? "—" : `${data.clarityScore.toFixed(1)}`}
                  </span>
                </div>
                <div className="p-3 rounded-lg border bg-muted/20 text-center">
                  <span className="text-xs text-muted-foreground block mb-1">Spoken fluency</span>
                  <span className={`text-base font-bold ${scoreClass(data.fluencyScore)}`}>
                    {data.fluencyScore === null ? "Not measured" : `${data.fluencyScore.toFixed(1)}`}
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                This week: {data.weeklyScore === null ? "no completed sessions" : data.weeklyScore.toFixed(1)}
                {" · "}
                Previous week: {data.previousWeekScore === null ? "no completed sessions" : data.previousWeekScore.toFixed(1)}
                {data.averageScore === null
                  ? ""
                  : data.averageScore >= 7
                    ? " · Interview readiness: ready to practise a live round."
                    : " · Interview readiness: keep practising before a live round."}
              </p>
            </CardContent>
          </Card>

          {/* Coaching Recommendations */}
          <Card className="shadow-xs flex flex-col justify-between">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Coaching Recommendations
              </CardTitle>
              <CardDescription>Personalized action items derived from your latest performances</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.recommendations.length > 0 ? (
                <div className="space-y-2.5 text-sm">
                  {data.recommendations.map((item) => (
                    <Link
                      key={item.id}
                      href={practiceHref(item.action_href)}
                      className="block rounded-lg border p-3 transition-colors hover:border-primary/50 hover:bg-muted/40"
                    >
                      <p className="font-medium">{item.title}</p>
                      <p className="mt-1 text-muted-foreground">{item.reason}</p>
                    </Link>
                  ))}
                </div>
              ) : data.averageScore === null ? (
                <div className="p-4 rounded-lg border bg-muted/30 text-sm text-muted-foreground">
                  Complete your first practice session to generate personalized feedback, score trends, and actionable recommendations.
                </div>
              ) : (
                <div className="space-y-2.5 text-sm">
                  {data.grammarScore !== null && data.grammarScore < 7 && (
                    <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/20 flex items-start gap-2.5">
                      <span className="font-bold text-amber-600 mt-0.5">•</span>
                      <span>Practice speaking in complete sentences and review subject-verb agreement patterns.</span>
                    </div>
                  )}
                  {data.vocabularyScore !== null && data.vocabularyScore < 7 && (
                    <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20 flex items-start gap-2.5">
                      <span className="font-bold text-blue-600 mt-0.5">•</span>
                      <span>Incorporate stronger domain-specific action verbs and concrete examples into your answers.</span>
                    </div>
                  )}
                  {data.fluencyScore !== null && data.fluencyScore < 7 && (
                    <div className="p-3 rounded-lg border border-purple-500/20 bg-purple-50/50 dark:bg-purple-950/20 flex items-start gap-2.5">
                      <span className="font-bold text-purple-600 mt-0.5">•</span>
                      <span>Try the Live Voice Interview mode to reduce hesitation pauses and build speaking rhythm.</span>
                    </div>
                  )}
                  {data.averageScore >= 7 && (
                    <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-start gap-2.5">
                      <span className="font-bold text-emerald-600 mt-0.5">•</span>
                      <span>Solid communication performance! Challenge yourself with Hard difficulty or a new practice track.</span>
                    </div>
                  )}
                </div>
              )}

              <Button asChild variant="outline" className="w-full">
                <Link href="/practice">
                  <BookOpen className="mr-2 h-4 w-4" /> Start Next Practice
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Sessions */}
        <Card className="shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg">Recent Practice Sessions</CardTitle>
              <CardDescription>Click any session to open its full evaluation and coaching breakdown</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/session-history">
                View all <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.recentSessions.length === 0 ? (
              <EmptyState
                icon={Target}
                title="No practice sessions yet"
                description="Start your first session today to build confidence and unlock diagnostic reports."
                actionLabel="Choose Practice Track"
                actionHref="/practice"
              />
            ) : (
              <div className="space-y-2.5">
                {data.recentSessions.map((session) => {
                  const displayMode = getDisplayMode({
                    mode: session.mode,
                    topic: session.topic,
                  });
                  const modeTitle = getModeTitle(displayMode);
                  const badgeClass = getModeBadgeClass(displayMode);

                  return (
                    <Link
                      key={session.session_id}
                      href={`/session-report/${encodeURIComponent(session.session_id)}`}
                      className="flex items-center justify-between gap-4 rounded-xl border p-4 transition-all hover:bg-muted/40 hover:border-primary/40 group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="p-2.5 rounded-lg border bg-card shrink-0">
                          {getModeIcon(displayMode)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                              {modeTitle}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${badgeClass}`}>
                              {session.status}
                            </span>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {session.topic || "General practice"} &bull; {session.question_count} questions &bull; {session.date}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className={`text-lg ${scoreClass(session.overall_score)}`}>
                          {session.overall_score === null ? "—" : `${session.overall_score.toFixed(1)}`}
                          <span className="text-xs font-normal text-muted-foreground">/10</span>
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDuration(session.duration_minutes)}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
