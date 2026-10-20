"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SessionDetail } from "@/lib/types/session-api";
import { sessionsAPI } from "@/lib/api/sessions";
import { initializePracticeSession, validateRoomSession } from "@/lib/api/practice-session";
import { getAPIErrorMessage } from "@/lib/api-client";
import { PracticeAuth } from "@/components/practice/practice-auth";
import { QuestionDisplay } from "@/components/practice/question-display";
import { TextAnswerInput } from "@/components/practice/text-answer-input";
import { VoiceAnswerInput } from "@/components/practice/voice-answer-input";
import { SessionControls } from "@/components/practice/session-controls";
import { Sparkles, ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function RoomLoading() {
  return <p role="status" className="py-12 text-center">Loading your saved practice session...</p>;
}

function PracticeRoom() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedId = searchParams.get("session");
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [recordingBusy, setRecordingBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const sessionRef = useRef<SessionDetail | null>(null);
  const savingRef = useRef(false);
  const viewVersion = useRef(0);
  const initialization = useRef<{ id: string; promise: Promise<SessionDetail> } | null>(null);

  useEffect(() => {
    let active = true;
    viewVersion.current += 1;
    sessionRef.current = null;
    savingRef.current = false;
    setSession(null);
    setIsSaving(false);
    setRecordingBusy(false);
    setSaveError(null);
    setLoadError(null);
    setIsLoading(true);
    let id = requestedId;
    try {
      sessionStorage.removeItem("practiceSessionConfig");
      sessionStorage.removeItem("practiceSessionState");
      if (id === null) id = sessionStorage.getItem("practiceSessionId");
    } catch {
      // A session UUID in the URL does not require browser storage.
    }
    if (!id || !UUID.test(id)) {
      setLoadError("Open a saved session link or start a new session from Practice.");
      setIsLoading(false);
      return;
    }
    if (requestedId === null) {
      router.replace(`/practice/room?session=${encodeURIComponent(id)}`);
      return;
    }
    // Keep the same in-flight promise across Strict Mode effect replay. Retry
    // explicitly clears it, so a failed PUT/start is recovered by a fresh GET.
    if (initialization.current?.id !== id) {
      initialization.current = { id, promise: initializePracticeSession(id) };
    }
    initialization.current.promise.then((detail) => {
      if (!active) return;
      sessionRef.current = detail;
      setSession(detail);
      try { sessionStorage.setItem("practiceSessionId", detail.id); } catch { /* URL is sufficient. */ }
    }).catch((error: unknown) => {
      if (active) setLoadError(getAPIErrorMessage(error));
    }).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => {
      active = false;
      viewVersion.current += 1;
    };
  }, [requestedId, router, attempt]);

  const reload = () => {
    if (savingRef.current || recordingBusy) return;
    initialization.current = null;
    setAttempt((value) => value + 1);
  };

  const mutate = async (request: (current: SessionDetail) => Promise<SessionDetail>): Promise<boolean> => {
    const current = sessionRef.current;
    if (!current || current.status !== "in_progress" || savingRef.current || recordingBusy) return false;
    const version = viewVersion.current;
    savingRef.current = true;
    setIsSaving(true);
    setSaveError(null);
    try {
      const saved = validateRoomSession(await request(current));
      if (viewVersion.current !== version) return false;
      sessionRef.current = saved;
      setSession(saved);
      return true;
    } catch (error) {
      if (viewVersion.current === version) setSaveError(getAPIErrorMessage(error));
      return false;
    } finally {
      if (viewVersion.current === version) {
        savingRef.current = false;
        setIsSaving(false);
      }
    }
  };

  const submitAnswer = (questionId: string, answer: string, transcriptEdited = false) => mutate((current) => {
    if (current.questions[current.current_question_index].id !== questionId) {
      throw new Error("The question has changed. Please answer the current question.");
    }
    return sessionsAPI.submitResponse(current.id, {
      question_id: questionId,
      answer_text: answer,
      interaction_mode: current.interaction_mode,
      transcript_edited: transcriptEdited,
    });
  });

  const navigate = (direction: -1 | 1) => mutate(async (current) => {
    const index = current.current_question_index + direction;
    if (index < 0 || index >= current.questions.length || (direction === 1 &&
      !current.responses.some((answer) => answer.question_id === current.questions[current.current_question_index].id))) {
      return current;
    }
    return sessionsAPI.updateSession(current.id, { current_question_index: index });
  });

  const complete = () => mutate((current) => {
    const allAnswered = current.questions.every((question) =>
      current.responses.some((answer) => answer.question_id === question.id));
    if (!allAnswered) throw new Error("Save an answer for every question before completing the session.");
    return sessionsAPI.completeSession(current.id);
  });

  const cancel = () => mutate((current) => sessionsAPI.updateSession(current.id, { status: "cancelled" }));

  if (isLoading) return <RoomLoading />;
  if (loadError || !session) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6 text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
          <h1 className="text-xl font-semibold">Unable to Load Session</h1>
          <p role="alert">{loadError || "Please try loading the session again."}</p>
          <Button onClick={reload}>Retry</Button>
          <Button variant="outline" asChild><Link href="/practice">Return to Practice</Link></Button>
        </CardContent>
      </Card>
    );
  }

  if (session.status === "completed" || session.status === "cancelled") {
    return (
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h1 className="text-2xl font-bold">Session {session.status}</h1>
          <p>{session.responses.length} of {session.question_count} answers saved.</p>
          <p className="text-sm text-muted-foreground">
            This session is read-only. Automated scoring and AI feedback are not available in this flow.
          </p>
          <ol className="space-y-4">
            {[...session.questions].sort((a, b) => a.order_index - b.order_index).map((question) => (
              <li key={question.id} className="rounded-lg border p-4 space-y-2">
                <h2 className="font-semibold">{question.order_index + 1}. {question.text}</h2>
                <p className="whitespace-pre-wrap text-sm">{
                  session.responses.find((answer) => answer.question_id === question.id)?.answer_text || "No saved answer."
                }</p>
              </li>
            ))}
          </ol>
          <Button asChild><Link href="/practice">Return to Practice</Link></Button>
        </CardContent>
      </Card>
    );
  }

  const currentQuestion = session.questions[session.current_question_index];
  const currentAnswer = session.responses.find((answer) => answer.question_id === currentQuestion.id);
  const answeredIndexes = session.questions.flatMap((question, index) =>
    session.responses.some((answer) => answer.question_id === question.id) ? [index] : []);
  const controlsDisabled = isSaving || recordingBusy;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" disabled={controlsDisabled} onClick={() => router.push("/practice")}>
          <ArrowLeft className="h-4 w-4 mr-2" />Back
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4" /><span className="capitalize">{session.mode} Practice</span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Static practice question bank · questions may repeat · only submitted answers are saved.
        Keep this page URL to resume your saved session.
      </p>
      {isSaving && <p role="status" className="text-sm">Saving to your session...</p>}
      {saveError && (
        <div role="alert" className="rounded-lg border border-destructive p-4 space-y-2">
          <p className="text-destructive">{saveError}</p>
          <p className="text-sm">The request was not confirmed. Retry the action, or reload saved state to check the server. Reloading discards unsaved edits.</p>
          <Button variant="outline" onClick={reload} disabled={controlsDisabled}>Reload saved state</Button>
        </div>
      )}
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          <QuestionDisplay
            key={currentQuestion.id}
            question={{ ...currentQuestion, context: currentQuestion.context ?? undefined, hints: currentQuestion.hints ?? undefined }}
            questionNumber={session.current_question_index + 1}
            totalQuestions={session.questions.length}
            difficulty={session.difficulty}
            mode={session.mode}
          />
          {session.interaction_mode === "text" ? (
            <TextAnswerInput
              key={currentQuestion.id}
              initialValue={currentAnswer?.answer_text || ""}
              onSubmit={(answer) => submitAnswer(currentQuestion.id, answer)}
              isSubmitted={!!currentAnswer}
              disabled={isSaving}
            />
          ) : (
            <VoiceAnswerInput
              key={currentQuestion.id}
              initialValue={currentAnswer?.answer_text || ""}
              initialTranscriptEdited={currentAnswer?.transcript_edited || false}
              onSubmit={(answer, edited) => submitAnswer(currentQuestion.id, answer, edited)}
              isSubmitted={!!currentAnswer}
              disabled={isSaving}
              language={session.explanation_language}
              onRecordingChange={setRecordingBusy}
            />
          )}
        </div>
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardContent className="pt-6">
              <SessionControls
                currentQuestionIndex={session.current_question_index}
                totalQuestions={session.questions.length}
                answeredQuestions={answeredIndexes.length}
                answeredQuestionIndexes={answeredIndexes}
                onPrevious={() => { void navigate(-1); }}
                onNext={() => { void navigate(1); }}
                onExit={() => { void cancel(); }}
                onComplete={() => { void complete(); }}
                canGoNext={session.current_question_index < session.questions.length - 1 && !!currentAnswer}
                canGoPrevious={session.current_question_index > 0}
                isLastQuestion={session.current_question_index === session.questions.length - 1}
                disabled={controlsDisabled}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function PracticeRoomPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-5xl">
        <PracticeAuth>
          <Suspense fallback={<RoomLoading />}><PracticeRoom /></Suspense>
        </PracticeAuth>
      </div>
    </div>
  );
}
