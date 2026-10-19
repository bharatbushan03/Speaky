"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/dashboard/stats-card";
import { PracticeModeCard } from "@/components/dashboard/practice-mode-card";
import { RecentSessionCard } from "@/components/dashboard/recent-session-card";
import { LearningProgress } from "@/components/dashboard/learning-progress";
import { RecommendedPractice } from "@/components/dashboard/recommended-practice";
import { EmptyState } from "@/components/dashboard/empty-state";
import { 
  Target, 
  TrendingUp, 
  Flame, 
  Clock,
  Briefcase,
  GraduationCap,
  BookOpen,
} from "lucide-react";

// Sample data - Replace with actual API data
const hasActivity = true; // Set to false to see empty state

const recentSessions = [
  {
    title: "Behavioral Questions Practice",
    type: "HR Interview",
    score: 85,
    date: "2 hours ago",
    duration: "15 min",
    improvements: ["Better clarity", "Improved confidence"],
  },
  {
    title: "System Design Discussion",
    type: "Technical",
    score: 72,
    date: "Yesterday",
    duration: "20 min",
    improvements: ["Technical vocabulary"],
  },
  {
    title: "Research Methodology Defense",
    type: "Academic Viva",
    score: 78,
    date: "2 days ago",
    duration: "18 min",
    improvements: ["Structured responses"],
  },
];

export default function DashboardPage() {
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
            value={hasActivity ? 24 : 0}
            description="All time practice"
            icon={Target}
            trend={hasActivity ? { value: 12, isPositive: true } : undefined}
          />
          <StatsCard
            title="Average Score"
            value={hasActivity ? "78%" : "--"}
            description="Across all sessions"
            icon={TrendingUp}
            trend={hasActivity ? { value: 8, isPositive: true } : undefined}
          />
          <StatsCard
            title="Current Streak"
            value={hasActivity ? "5 days" : "0 days"}
            description="Keep it going!"
            icon={Flame}
            trend={hasActivity ? { value: 2, isPositive: true } : undefined}
          />
          <StatsCard
            title="Practice Time"
            value={hasActivity ? "6.5h" : "0h"}
            description="This month"
            icon={Clock}
          />
        </div>

        {/* Practice Modes */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Practice Modes</h2>
              <p className="text-muted-foreground text-sm">
                Choose your training focus
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <PracticeModeCard
              title="HR Interview"
              description="Master behavioral questions, company culture fit, and professional communication"
              icon={Briefcase}
              difficulty="Intermediate"
              completedSessions={hasActivity ? 8 : 0}
              estimatedTime="15-20 min"
              href="/practice/hr"
            />
            <PracticeModeCard
              title="Technical Interview"
              description="Explain complex concepts clearly and handle technical discussions with confidence"
              icon={BookOpen}
              difficulty="Advanced"
              completedSessions={hasActivity ? 12 : 0}
              estimatedTime="20-25 min"
              href="/practice/technical"
            />
            <PracticeModeCard
              title="Academic Viva"
              description="Defend your research, present findings, and answer academic questions professionally"
              icon={GraduationCap}
              difficulty="Advanced"
              completedSessions={hasActivity ? 4 : 0}
              estimatedTime="20-30 min"
              href="/practice/viva"
            />
          </div>
        </div>

        {/* Two Column Layout for Recent Sessions and Progress */}
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
                {hasActivity ? (
                  <div className="space-y-4">
                    {recentSessions.map((session, index) => (
                      <RecentSessionCard key={index} {...session} />
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

          {/* Learning Progress - Takes 1 column */}
          <div className="space-y-6">
            {hasActivity ? (
              <>
                <LearningProgress />
                <RecommendedPractice />
              </>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Learning Progress</CardTitle>
                  <CardDescription>
                    Your skill development journey
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <EmptyState
                    icon={TrendingUp}
                    title="No data yet"
                    description="Complete your first practice session to start tracking your skill progress"
                    actionLabel="Start Practicing"
                    actionHref="/practice"
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
