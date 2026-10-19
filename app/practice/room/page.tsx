"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PracticeSessionConfig } from "@/lib/types/practice";
import { SessionState, Question, Answer } from "@/lib/types/session";
import { QuestionGenerator } from "@/lib/services/question-generator";
import { QuestionDisplay } from "@/components/practice/question-display";
import { TextAnswerInput } from "@/components/practice/text-answer-input";
import { VoiceAnswerInput } from "@/components/practice/voice-answer-input";
import { SessionControls } from "@/components/practice/session-controls";
import { Sparkles, ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";

const SESSION_STORAGE_KEY = "practiceSessionConfig";
const SESSION_STATE_KEY = "practiceSessionState";

export default function PracticeRoomPage() {
  const router = useRouter();
  const [config, setConfig] = useState<PracticeSessionConfig | null>(null);
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize session
  useEffect(() => {
    try {
      // Load configuration
      const storedConfig = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!storedConfig) {
        router.push("/practice");
        return;
      }

      const parsedConfig: PracticeSessionConfig = JSON.parse(storedConfig);
      setConfig(parsedConfig);

      // Check if there's an existing session state
      const storedState = sessionStorage.getItem(SESSION_STATE_KEY);
      if (storedState) {
        const parsedState: SessionState = JSON.parse(storedState);
        // Restore dates from ISO strings
        parsedState.startTime = parsedState.startTime ? new Date(parsedState.startTime) : null;
        parsedState.endTime = parsedState.endTime ? new Date(parsedState.endTime) : null;
        parsedState.answers = parsedState.answers.map((answer) => ({
          ...answer,
          timestamp: new Date(answer.timestamp),
        }));
        setSessionState(parsedState);
      } else {
        // Generate new questions
        const questions = QuestionGenerator.generateQuestions({
          mode: parsedConfig.mode,
          difficulty: parsedConfig.difficulty,
          count: parsedConfig.questionCount,
          jobRole: parsedConfig.jobRole,
          subject: parsedConfig.subject,
          topicFocus: parsedConfig.topicFocus,
        });

        const newState: SessionState = {
          config: parsedConfig,
          questions,
          answers: [],
          currentQuestionIndex: 0,
          status: "in_progress",
          startTime: new Date(),
          endTime: null,
        };

        setSessionState(newState);
        saveSessionState(newState);
      }

      setIsLoading(false);
    } catch (err) {
      console.error("Failed to initialize session:", err);
      setError("Failed to load practice session. Please try again.");
      setIsLoading(false);
    }
  }, [router]);

  // Save session state to sessionStorage
  const saveSessionState = (state: SessionState) => {
    sessionStorage.setItem(SESSION_STATE_KEY, JSON.stringify(state));
  };

  // Handle answer submission
  const handleAnswerSubmit = (answerText: string, transcriptEdited?: boolean) => {
    if (!sessionState || !config) return;

    const currentQuestion = sessionState.questions[sessionState.currentQuestionIndex];
    const existingAnswerIndex = sessionState.answers.findIndex(
      (a) => a.questionId === currentQuestion.id
    );

    const newAnswer: Answer = {
      questionId: currentQuestion.id,
      text: answerText,
      timestamp: new Date(),
      interactionMode: config.interactionMode,
      transcriptEdited: transcriptEdited,
    };

    let updatedAnswers: Answer[];
    if (existingAnswerIndex >= 0) {
      // Update existing answer
      updatedAnswers = [...sessionState.answers];
      updatedAnswers[existingAnswerIndex] = newAnswer;
    } else {
      // Add new answer
      updatedAnswers = [...sessionState.answers, newAnswer];
    }

    const updatedState: SessionState = {
      ...sessionState,
      answers: updatedAnswers,
    };

    setSessionState(updatedState);
    saveSessionState(updatedState);
  };

  // Handle answer edit
  const handleAnswerEdit = () => {
    // Answer is now editable, no special action needed
  };

  // Navigation handlers
  const handlePrevious = () => {
    if (!sessionState) return;
    const newIndex = Math.max(0, sessionState.currentQuestionIndex - 1);
    const updatedState = { ...sessionState, currentQuestionIndex: newIndex };
    setSessionState(updatedState);
    saveSessionState(updatedState);
  };

  const handleNext = () => {
    if (!sessionState) return;
    const newIndex = Math.min(
      sessionState.questions.length - 1,
      sessionState.currentQuestionIndex + 1
    );
    const updatedState = { ...sessionState, currentQuestionIndex: newIndex };
    setSessionState(updatedState);
    saveSessionState(updatedState);
  };

  // Session control handlers
  const handleExit = () => {
    // Clear session state and return to practice selection
    sessionStorage.removeItem(SESSION_STATE_KEY);
    router.push("/practice");
  };

  const handleComplete = () => {
    if (!sessionState) return;

    const completedState: SessionState = {
      ...sessionState,
      status: "completed",
      endTime: new Date(),
    };

    setSessionState(completedState);
    saveSessionState(completedState);

    // TODO: Navigate to session summary/results page
    // For now, show success and redirect to dashboard
    alert("Practice session completed! Results and feedback will be available soon.");
    sessionStorage.removeItem(SESSION_STATE_KEY);
    router.push("/dashboard");
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-center">
          <Sparkles className="h-12 w-12 mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading your practice session...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !config || !sessionState) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold">Failed to Load Session</h2>
            <p className="text-muted-foreground">
              {error || "Unable to load practice session. Please try again."}
            </p>
            <Button asChild>
              <Link href="/practice">Return to Practice</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get current question and answer
  const currentQuestion = sessionState.questions[sessionState.currentQuestionIndex];
  const currentAnswer = sessionState.answers.find((a) => a.questionId === currentQuestion.id);
  const isCurrentAnswered = !!currentAnswer;

  // Navigation state
  const canGoNext =
    sessionState.currentQuestionIndex < sessionState.questions.length - 1 && isCurrentAnswered;
  const canGoPrevious = sessionState.currentQuestionIndex > 0;
  const isLastQuestion = sessionState.currentQuestionIndex === sessionState.questions.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/practice">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              <span className="capitalize">{config.mode} Practice</span>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-[1fr_320px] gap-6">
            {/* Left Column: Question and Answer */}
            <div className="space-y-6">
              {/* Question Display */}
              <QuestionDisplay
                question={currentQuestion}
                questionNumber={sessionState.currentQuestionIndex + 1}
                totalQuestions={sessionState.questions.length}
                difficulty={config.difficulty}
                mode={config.mode}
              />

              {/* Answer Input */}
              {config.interactionMode === "text" ? (
                <TextAnswerInput
                  initialValue={currentAnswer?.text || ""}
                  onSubmit={handleAnswerSubmit}
                  isSubmitted={isCurrentAnswered}
                  onEdit={handleAnswerEdit}
                />
              ) : (
                <VoiceAnswerInput
                  initialValue={currentAnswer?.text || ""}
                  onSubmit={handleAnswerSubmit}
                  isSubmitted={isCurrentAnswered}
                  onEdit={handleAnswerEdit}
                  language={config.explanationLanguage}
                />
              )}
            </div>

            {/* Right Column: Session Controls */}
            <div className="lg:sticky lg:top-6 lg:self-start">
              <Card>
                <CardContent className="pt-6">
                  <SessionControls
                    currentQuestionIndex={sessionState.currentQuestionIndex}
                    totalQuestions={sessionState.questions.length}
                    answeredQuestions={sessionState.answers.length}
                    onPrevious={handlePrevious}
                    onNext={handleNext}
                    onExit={handleExit}
                    onComplete={handleComplete}
                    canGoNext={canGoNext}
                    canGoPrevious={canGoPrevious}
                    isLastQuestion={isLastQuestion}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
