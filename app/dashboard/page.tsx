"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ProgressSummary } from "@/lib/types/session-api";
import { ProgressLoading, ProgressEmpty } from "./progress-loading";
import { Target, TrendingUp, Flame, Clock, Briefcase, GraduationCap, BookOpen } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

interface DashboardData {
  totalSessions: number;
  averageScore: number | null;
  grammarScore: number | null;
  vocabularyScore: number | null;
  fluencyScore: number | null;
  currentStreak: number;
  longestStreak: number;
  lastPracticeDate: string | null;
  sessionsByMode: Record<string, number>;
  recentSessions: RecentSession[];
  isLoading: boolean;
  error: string | null;
}

interface RecentSession {
  id: string;
  mode: string;
  topic: string | null;
  status: string;
  questionCount: number;
  startedAt: string | null;
  completedAt: string | null;
  overallScore: number | null;
  date: string;
  duration: string;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [summary, history] = await Promise.all([
          fetch("/api/v1/progress/summary", {
            credentials: "include",
          }).then((res) => res.json()),
          fetch("/api/v1/progress/history", {
            credentials: "include",
          }).then((res) => res.json()),
        ]);

        // Transform summary data
        const sessionsByMode: Record<string, number> = {};
        if (summary.sessions_by_mode) {
          for (const [mode, count] of Object.entries(summary.sessions_by_mode)) {
            sessionsByMode[mode] = count;
          }
        }

        const recentSessions: RecentSession = history.map((session: any) => ({
          id: session.session_id,
          mode: session.mode,
          topic: session.topic || undefined,
          status: session.status,
          questionCount: session.question_count,
          startedAt: session.started_at,
          completedAt: session.completed_at,
          overallScore: session.overall_score,
          date: session.date || "",
          duration: session.duration || "0 min",
        }));

        setData({
          totalSessions: summary.total_sessions,
          averageScore: summary.average_score,
          grammarScore: summary.grammar_score,
          vocabularyScore: summary.vocabulary_score,
          fluencyScore: summary.fluency_score,
          currentStreak: summary.current_streak,
          longestStreak: summary.longest_streak,
          lastPracticeDate: summary.last_practice_date,
          sessionsByMode,
          recentSessions,
          isLoading: false,
          error: null,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load progress data");
        setData({
          totalSessions: 0,
          averageScore: null,
          grammarScore: null,
          vocabularyScore: null,
          fluencyScore: null,
          currentStreak: 0,
          longestStreak: 0,
          lastPracticeDate: null,
          sessionsByMode: {},
          recentSessions: [],
          isLoading: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return <ProgressLoading />;
  }

  if (error) {
    return <ProgressEmpty error={error} />;
  }

  if (!data) {
    return <ProgressEmpty error="No data available" />;
  }

  // Calculate practice time from sessions
  const totalDurationMinutes = data.recentSessions.reduce(
    (sum, session) => {
      // Extract duration from "15 min", "20 min", etc.
      const match = session.duration.match(/(\d+)/);
      const minutes = match ? parseInt(match[1], 10) : 0;
      return sum + minutes;
    },
    0
  );

  const practiceHours = Math.round((totalDurationMinutes / 60) * 10) / 10;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Welcome back! 👋</h1>
          <p className="text-muted-foreground">
            Track your progress and continue your journey to confident communication
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Total Sessions"
            value={data.totalSessions.toString()}
            description="All time practice"
            icon={Target}
            trend={data.averageScore !== null && data.sessionsByMode ? { value: 8, isPositive: true } : undefined}
          />
          <StatsCard
            title="Average Score"
            value={data.averageScore !== null ? `${data.averageScore}%` : "--"}
            description="Across all sessions"
            icon={TrendingUp}
            trend={data.averageScore !== null && data.averageScore > 70 ? { value: 8, isPositive: true } : data.averageScore !== null && data.averageScore > 50 ? { value: 5, isPositive: true } : undefined}
          />
          <StatsCard
            title="Current Streak"
            value={data.currentStreak > 0 ? `${data.currentStreak} days` : "0 days"}
            description="Keep it going!"
            icon={Flame}
            trend={data.currentStreak > 0 ? { value: data.currentStreak, isPositive: true } : undefined}
          />
          <StatsCard
            title="Practice Time"
            value={data.averageScore !== null ? `${practiceHours}h` : "0h"}
            description="This month"
            icon={Clock}
          />
        </div>

        {/* Progress Summary Section */}
        {data.averageScore !== null && (
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Communication Score Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold {data.averageScore >= 70 ? "text-green-600" : data.averageScore >= 50 ? "text-yellow-600" : "text-red-600"}">
                  {data.averageScore}
                </div>
                <div className="text-sm text-muted-foreground mb-2">out of 10</div>
                <Progress value={Math.round(data.averageScore)} className="my-4" />
                <div className="grid grid-cols-2 text-xs text-muted-foreground gap-2">
                  <div>
                    <strong>Grammar:</strong> {data.grammarScore !== null ? `${data.grammarScore}` : "N/A"} / 10
                  </div>
                  <div>
                    <strong>Vocabulary:</strong> {data.vocabularyScore !== null ? `${data.vocabularyScore}` : "N/A"} / 10
                  </div>
                </div>
                {data.fluencyScore !== null && (
                  <div>
                    <strong>Fluency:</strong> {data.fluencyScore} / 10
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Learning Streak</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold {data.currentStreak > 0 ? "text-green-600" : "text-red-500"}">
                  {data.currentStreak > 0 ? data.currentStreak : 0}
                </div>
                <div className="text-sm text-muted-foreground">Current streak</div>
                <div className="text-sm text-muted-foreground">Longest: {data.longestStreak} days</div>
                {data.lastPracticeDate && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Last practice: {data.lastPracticeDate}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Sessions by Mode</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(data.sessionsByMode).map(([mode, count]) => (
                    <div key={mode} className="flex items-center justify-between text-sm">
                      <span>{mode}</span>
                      <span>{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Two Column Layout for Recent Sessions and Recommendations */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Recent Sessions - Takes 2 columns */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Sessions</CardTitle>
                <CardDescription>
                  Your latest practice sessions and improvements
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.recentSessions.length > 0 ? (
                  <div className="space-y-4">
                    {data.recentSessions.map((session, index) => (
                      <div key={index} className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm {session.overallScore !== null ? session.overallScore >= 80 ? "text-green-600" : session.overallScore >= 60 ? "text-yellow-600" : "text-red-600" : ""}>
                            {session.mode} Practice
                          </h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {session.topic || "No topic focus"} • {session.questionCount} questions
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={cn("text-2xl font-bold", session.overallScore >= 80 ? "text-green-600" : session.overallScore >= 60 ? "text-yellow-600" : "text-red-600")}>
                            {session.overallScore ?? "—"}
                          </div>
                          <div className="text-xs text-muted-foreground">Score</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Target}
                    title="No sessions yet"
                    description="Start practicing to track your progress and see detailed feedback on your performance"
                    actionLabel="Start First Practice"
                    actionHref="/practice"
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Learning Recommendations - Takes 1 column */}
          <div className="space-y-6">
            {data.averageScore !== null && data.averageScore < 7 ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-warning" />
                    <CardTitle>Recommended for You</CardTitle>
                  </div>
                  <CardDescription>
                    AI-powered suggestions based on your performance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!data.recentSessions.some(s => s.overallScore !== null && s.overallScore < 7) ? (
                    <p className="text-sm text-muted-foreground">
                      Keep practicing! Your scores are looking good.
                    </p>
                  ) : (
                    <>
                      {/* Grammar recommendation if grammar score is low */}
                      {data.grammarScore !== null && data.grammarScore < 7 && (
                        <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-green-200">
                          <Sparkles className="h-3 w-3 text-green-500 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-sm">Practise recurring grammar mistakes</p>
                            <p className="text-xs text-green-600">Your grammar score is {data.grammarScore}. Focus on common patterns in your next practice session.</p>
                          </div>
                        </div>
                      )}

                      {/* Vocabulary recommendation if vocabulary score is low */}
                      {data.vocabularyScore !== null && data.vocabularyScore < 7 && (
                        <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-purple-200">
                          <BookOpen className="h-3 w-3 text-purple-500 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-sm">Expand your vocabulary</p>
                            <p className="text-xs text-purple-600">Your vocabulary score is {data.vocabularyScore}. Try learning 5 new words related to interview topics each week.</p>
                          </div>
                        </div>
                      )}

                      {/* Fluency recommendation if fluency score is low */}
                      {data.fluencyScore !== null && data.fluencyScore < 7 && (
                        <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-blue-200">
                          <Flame className="h-3 w-3 text-blue-500 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-sm">Work on fluency and pacing</p>
                            <p className="text-xs text-blue-600">Your fluency score is {data.fluencyScore}. Record your answers and review timing.</p>
                          </div>
                        </div>
                      )}

                      {/* Structure recommendation */
                      <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-blue-300">
                        <GraduationCap className="h-3 w-3 text-blue-500 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">Improve answer structure</p>
                          <p className="text-xs text-blue-600">Structure answers with: Point → Evidence → Result for better communication scores.</p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Recommended for You</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Complete more sessions to receive personalized recommendations
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}