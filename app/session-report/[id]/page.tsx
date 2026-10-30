"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { sessionsAPI } from "@/lib/api/sessions";
import { SessionDetail, SessionEvaluation } from "@/lib/types/session-api";
import { getAPIErrorMessage } from "@/lib/api-client";
import { EvaluationReport } from "@/components/practice/evaluation-report";

function statusOf(error: unknown): number | undefined {
  return error && typeof error === "object" && "status" in error
    ? (error as { status?: number }).status
    : undefined;
}

export default function SessionReportPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [evaluation, setEvaluation] = useState<SessionEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(() => {
    const id = params.id;
    if (!id) return;
    setLoading(true);
    setError(null);
    sessionsAPI.getSession(id)
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
      .catch((caught) => { setError(getAPIErrorMessage(caught)); })
      .finally(() => { setLoading(false); });
  }, [params.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="container mx-auto space-y-4 px-4 py-8 max-w-5xl" role="status">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="container mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
        <h1 className="text-xl font-semibold">Report unavailable</h1>
        <p role="alert" className="text-sm text-muted-foreground">{error || "This session could not be loaded."}</p>
        <Button onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="container mx-auto max-w-lg space-y-4 px-4 py-8 text-center">
        <h1 className="text-xl font-semibold capitalize">{session.status.replace("_", " ")} session</h1>
        <p className="text-sm text-muted-foreground">A coaching report is available after the session is completed.</p>
        <Button asChild><Link href={`/practice/room?session=${encodeURIComponent(session.id)}`}>Open session</Link></Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto space-y-6 px-4 py-8 max-w-5xl">
        <Button variant="ghost" onClick={() => router.back()} className="mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" />Back to sessions
        </Button>

        <EvaluationReport
          evaluation={evaluation}
          isLoading={false}
          error={null}
          onRetry={loadData}
        />
      </div>
    </div>
  );
}
