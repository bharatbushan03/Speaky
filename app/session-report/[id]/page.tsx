"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Sparkles,
  RotateCcw,
  LayoutDashboard,
  Globe,
  Briefcase,
  Code,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { sessionsAPI } from "@/lib/api/sessions";
import { healthAPI, ProviderDiagnostics } from "@/lib/api/health";
import { SessionDetail, SessionEvaluation } from "@/lib/types/session-api";
import { getAPIErrorMessage } from "@/lib/api-client";
import { EvaluationReport } from "@/components/practice/evaluation-report";
import { getDisplayMode, getModeTitle, getModeBadgeClass } from "@/lib/types/practice";

function statusOf(error: unknown): number | undefined {
  return error && typeof error === "object" && "status" in error
    ? (error as { status?: number }).status
    : undefined;
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

export default function SessionReportPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [evaluation, setEvaluation] = useState<SessionEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [providers, setProviders] = useState<ProviderDiagnostics | null>(null);

  const loadData = useCallback(() => {
    const id = params.id;
    if (!id) return;
    void healthAPI.getProviders().then(setProviders).catch(() => undefined);
    setLoading(true);
    setError(null);
    sessionsAPI
      .getSession(id)
      .then(async (loadedSession) => {
        setSession(loadedSession);
        if (loadedSession.status !== "completed") {
          setEvaluation(null);
          return;
        }
        try {
          setEvaluation(await sessionsAPI.getEvaluation(id));
        } catch (caught) {
          if (statusOf(caught) !== 404) throw caught;
          setEvaluation(await sessionsAPI.evaluateSession(id));
        }
      })
      .catch((caught) => {
        setError(getAPIErrorMessage(caught));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [params.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="container mx-auto space-y-4 px-4 py-8 max-w-5xl" role="status">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="container mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-xl font-semibold">Report unavailable</h1>
        <p role="alert" className="text-sm text-muted-foreground">
          {error || "This session could not be loaded."}
        </p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>
    );
  }

  const displayMode = getDisplayMode(session);
  const modeTitle = getModeTitle(displayMode);
  const badgeClass = getModeBadgeClass(displayMode);

  if (!evaluation) {
    return (
      <div className="container mx-auto max-w-lg space-y-4 px-4 py-16 text-center">
        <div className="p-3 bg-muted rounded-full w-12 h-12 flex items-center justify-center mx-auto">
          {getModeIcon(displayMode)}
        </div>
        <h1 className="text-2xl font-bold capitalize">
          {modeTitle} Session ({session.status.replace("_", " ")})
        </h1>
        <p className="text-sm text-muted-foreground">
          {session.status === "in_progress" || session.status === "created"
            ? "This session is currently in progress. Complete all answers to generate your diagnostic report."
            : "A coaching report is generated once all questions are answered and the session is completed."}
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Button asChild>
            <Link href={`/practice/room?session=${encodeURIComponent(session.id)}`}>
              Open Practice Room
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/session-history">Back to History</Link>
          </Button>
        </div>
      </div>
    );
  }

  const practiceAgainHref =
    displayMode === "english"
      ? "/practice/english"
      : displayMode === "technical"
      ? "/practice/technical"
      : displayMode === "viva"
      ? "/practice/viva"
      : "/practice/hr";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-muted/10 to-background">
      <div className="container mx-auto space-y-6 px-4 py-8 max-w-5xl">
        {/* Navigation & Header Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/session-history">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Session History
            </Link>
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">
                <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" /> Dashboard
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href={practiceAgainHref}>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Practice Again
              </Link>
            </Button>
          </div>
        </div>

        {/* Session Metadata Banner */}
        <Card className="shadow-xs border bg-card/60 backdrop-blur">
          <CardContent className="p-4 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl border bg-card shrink-0">
                {getModeIcon(displayMode)}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-lg md:text-xl text-foreground">
                    {modeTitle} Evaluation
                  </h2>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${badgeClass}`}>
                    Completed
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {session.topic_focus || session.job_role || session.subject || "General practice"} &bull;{" "}
                  {session.questions.length} questions &bull; Language:{" "}
                  <span className="capitalize font-medium">{session.explanation_language}</span>
                </p>
                {providers && (
                  <p className="text-xs text-muted-foreground">
                    Questions and evaluation: {providers.llm.configured ? `${providers.llm.provider} ${providers.llm.model}` : "not configured"}.
                    {" "}Speech: {providers.tts.configured ? `${providers.tts.provider} ${providers.tts.model} ${providers.tts.voice}` : `${providers.tts.provider} not configured`}.
                    {" "}Transcription: {providers.stt.configured ? `${providers.stt.provider} ${providers.stt.model}` : `${providers.stt.provider} not configured`}.
                    {" "}{providers.evon.reason}
                  </p>
                )}
              </div>
            </div>

            <Button asChild size="sm" className="shrink-0 font-semibold shadow-xs">
              <Link href={practiceAgainHref}>
                <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Start New Session
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Detailed Evaluation Report */}
        <EvaluationReport
          evaluation={evaluation}
          isLoading={false}
          error={null}
          onRetry={loadData}
          answers={Object.fromEntries(session.responses.map((response) => [response.question_id, response.answer_text]))}
        />
      </div>
    </div>
  );
}
