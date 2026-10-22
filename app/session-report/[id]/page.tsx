"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { sessionsAPI } from "@/lib/api/sessions";
import { SessionDetail, SessionEvaluation } from "@/lib/types/session-api";
import { getAPIErrorMessage } from "@/lib/api-client";

function scoreClass(score: number | null) {
  if (score === null) return "text-muted-foreground";
  if (score >= 8) return "text-green-600";
  if (score >= 6) return "text-yellow-600";
  return "text-red-600";
}

export default function SessionReportPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [evaluation, setEvaluation] = useState<SessionEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = params.id;
    if (!id) return;
    let active = true;
    setLoading(true);
    Promise.all([sessionsAPI.getSession(id), sessionsAPI.getEvaluation(id)])
      .then(([loadedSession, loadedEvaluation]) => {
        if (!active) return;
        setSession(loadedSession);
        setEvaluation(loadedEvaluation);
      })
      .catch((caught) => { if (active) setError(getAPIErrorMessage(caught)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [params.id]);

  if (loading) return <div className="container mx-auto space-y-4 px-4 py-8" role="status"><Skeleton className="h-10 w-64" /><Skeleton className="h-64" /></div>;
  if (error || !session || !evaluation) {
    return <div className="container mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center"><h1 className="text-xl font-semibold">Report unavailable</h1><p role="alert" className="text-sm text-muted-foreground">{error || "This session has not been evaluated yet."}</p><Button onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button></div>;
  }

  const questionById = new Map(session.questions.map((question) => [question.id, question.text]));
  const answerById = new Map(session.responses.map((answer) => [answer.id, answer.answer_text]));

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto space-y-6 px-4 py-8">
        <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" />Back to sessions</Button>
        <Card>
          <CardHeader><CardTitle>Session Report</CardTitle><CardDescription className="capitalize">{session.mode} practice · {session.topic_focus || session.job_role || session.subject || "No topic focus"}</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            <div className={`rounded-lg border p-5 ${evaluation.overall_score === null ? "bg-muted/30" : "bg-primary/5"}`}>
              <p className={`text-4xl font-bold ${scoreClass(evaluation.overall_score)}`}>{evaluation.overall_score === null ? "—" : `${evaluation.overall_score.toFixed(1)} / 10`}</p>
              <p className="text-sm text-muted-foreground">Overall communication score</p>
            </div>
            <p>{evaluation.summary}</p>
            <div className="grid gap-3 md:grid-cols-2">
              {Object.entries(evaluation.dimensions).map(([dimension, result]) => (
                <div key={dimension} className="space-y-2 rounded-lg border p-4">
                  <div className="flex justify-between gap-3"><span className="font-medium capitalize">{dimension.replaceAll("_", " ")}</span><span>{result.available && result.score !== null ? `${result.score.toFixed(1)} / 10` : "Unavailable"}</span></div>
                  {result.available && result.score !== null && <Progress value={result.score * 10} aria-label={`${dimension} score`} />}
                  <p className="text-sm text-muted-foreground">{result.explanation}</p>
                </div>
              ))}
            </div>
            {(evaluation.strengths.length > 0 || evaluation.improvements.length > 0) && <div className="grid gap-4 md:grid-cols-2"><CoachingList title="Strengths" items={evaluation.strengths} /><CoachingList title="Next improvements" items={evaluation.improvements} /></div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Answer coaching</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {evaluation.answer_evaluations.map((answer, index) => (
              <article key={answer.response_id} className="space-y-3 border-b pb-5 last:border-0 last:pb-0">
                <h2 className="font-semibold">Question {index + 1}: {questionById.get(answer.question_id) || "Saved question"}</h2>
                <p className="rounded-md bg-muted/50 p-3 text-sm"><span className="font-medium">Your answer:</span> {answerById.get(answer.response_id) || "—"}</p>
                <p className="rounded-md border p-3 text-sm"><span className="font-medium">Corrected answer:</span> {answer.corrected_answer}</p>
                {answer.corrections.length > 0 && <ul className="space-y-2 text-sm">{answer.corrections.map((correction, correctionIndex) => <li key={`${answer.response_id}-${correctionIndex}`} className="rounded border p-3"><p className="font-medium capitalize">{correction.category}</p><p><span className="text-muted-foreground">Original:</span> {correction.original}</p><p><span className="text-muted-foreground">Corrected:</span> {correction.corrected}</p><p className="text-muted-foreground">{correction.explanation}</p></li>)}</ul>}
                {answer.improvements.length > 0 && <CoachingList title="Try next time" items={[...answer.improvements, ...answer.retry_recommendations]} />}
              </article>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CoachingList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return <div><h3 className="mb-2 flex items-center gap-2 font-medium"><CheckCircle2 className="h-4 w-4 text-primary" />{title}</h3><ul className="space-y-1 text-sm text-muted-foreground">{items.map((item, index) => <li key={`${title}-${index}`}>• {item}</li>)}</ul></div>;
}
