"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  X,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SessionControlsProps {
  currentQuestionIndex: number;
  totalQuestions: number;
  answeredQuestions: number;
  answeredQuestionIndexes?: number[];
  onPrevious: () => void;
  onNext: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onExit: () => void;
  onComplete: () => void;
  isPaused?: boolean;
  canGoNext: boolean;
  canGoPrevious: boolean;
  isLastQuestion: boolean;
  disabled?: boolean;
}

export function SessionControls({
  currentQuestionIndex,
  totalQuestions,
  answeredQuestions,
  answeredQuestionIndexes,
  onPrevious,
  onNext,
  onPause,
  onResume,
  onExit,
  onComplete,
  isPaused = false,
  canGoNext,
  canGoPrevious,
  isLastQuestion,
  disabled = false,
}: SessionControlsProps) {
  const progress = (answeredQuestions / totalQuestions) * 100;
  const currentNumber = currentQuestionIndex + 1;

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Progress</span>
          <span className="text-muted-foreground">
            {answeredQuestions} of {totalQuestions} answered
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question Navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="lg"
          onClick={onPrevious}
          disabled={!canGoPrevious || isPaused || disabled}
          className="gap-2 flex-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        <div className="flex-shrink-0 px-4 py-2 bg-muted rounded-md">
          <span className="font-semibold">
            {currentNumber} / {totalQuestions}
          </span>
        </div>

        {!isLastQuestion ? (
          <Button
            variant="outline"
            size="lg"
            onClick={onNext}
            disabled={!canGoNext || isPaused || disabled}
            className="gap-2 flex-1"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="default"
                size="lg"
                disabled={answeredQuestions < totalQuestions || isPaused || disabled}
                className="gap-2 flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4" />
                Complete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Complete Practice Session?</AlertDialogTitle>
                <AlertDialogDescription>
                  All {totalQuestions} answers are saved. Complete this session to make it read-only. AI scoring and feedback are not available in this flow.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Review Answers</AlertDialogCancel>
                <AlertDialogAction onClick={onComplete} disabled={disabled} className="bg-green-600 hover:bg-green-700">
                  Complete Session
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Session Actions */}
      <div className="flex items-center gap-2 pt-2">
        {/* Pause/Resume - Optional feature for future */}
        {(onPause || onResume) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={isPaused ? onResume : onPause}
            disabled={disabled}
            className="gap-2"
          >
            {isPaused ? (
              <>
                <Play className="h-4 w-4" />
                Resume
              </>
            ) : (
              <>
                <Pause className="h-4 w-4" />
                Pause
              </>
            )}
          </Button>
        )}

        {/* Exit Session */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" disabled={disabled} className="gap-2 ml-auto text-destructive hover:text-destructive">
              <X className="h-4 w-4" />
              Cancel Session
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Practice Session?</AlertDialogTitle>
              <AlertDialogDescription>
                Saved answers will remain available for review. Unsaved edits will be discarded, and this session cannot be resumed. Use Back instead to leave and resume later using this page URL.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Continue Practicing</AlertDialogCancel>
              <AlertDialogAction onClick={onExit} disabled={disabled} className="bg-destructive hover:bg-destructive/90">
                Cancel Session
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Answer Status Indicators */}
      <div className="flex flex-wrap gap-2 pt-2">
        {Array.from({ length: totalQuestions }).map((_, index) => {
          const isAnswered = answeredQuestionIndexes ? answeredQuestionIndexes.includes(index) : index < answeredQuestions;
          const isCurrent = index === currentQuestionIndex;

          return (
            <div
              key={index}
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                isCurrent && "ring-2 ring-primary ring-offset-2",
                isAnswered
                  ? "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300"
                  : "bg-muted text-muted-foreground"
              )}
              title={`Question ${index + 1}${isAnswered ? " (answered)" : ""}`}
            >
              {index + 1}
            </div>
          );
        })}
      </div>
    </div>
  );
}
