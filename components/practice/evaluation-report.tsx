"use client";

import { AlertCircle, CheckCircle2, Lightbulb, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SessionEvaluation, EvaluationDimension } from "@/lib/types/session-api";

interface EvaluationReportProps {
  evaluation: SessionEvaluation | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

const DIMENSION_ORDER: EvaluationDimension[] = [
  "grammar",
  "vocabulary",
  "clarity",
  "coherence",
  "relevance",
  "interview_technique",
  "technical_correctness",
  "spoken_fluency",
];

function labelForDimension(dimension: EvaluationDimension) {
  return dimension
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function EvaluationReport({ evaluation, isLoading, error, onRetry }: EvaluationReportProps) {
  return (
    <section aria-labelledby="evaluation-heading" className="space-y-4">
      <div>
        <h2 id="evaluation-heading" className="text-xl font-semibold">AI answer coaching</h2>
        <p className="text-sm text-muted-foreground">
          Your corrected English keeps your intended meaning. Scores are shown only when the evaluator had enough evidence.
        </p>
      </div>

      {isLoading && (
        <Card>
          <CardContent className="flex items-center gap-3 py-8" role="status">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Evaluating your answers and preparing coaching...</span>
          </CardContent>
        </Card>
      )}

      {error && !isLoading && (
        <Card className="border-destructive">
          <CardContent className="space-y-3 py-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <h3 className="font-semibold">Feedback could not be loaded</h3>
                <p role="alert" className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
            <Button variant="outline" onClick={onRetry} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Retry feedback
            </Button>
          </CardContent>
        </Card>
      )}

      {evaluation && !isLoading && (
        <div className="space-y-4">
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-4">
                <span>Overall result</span>
                <span className="text-2xl text-primary">
                  {evaluation.overall_score === null ? "Unavailable" : `${evaluation.overall_score.toFixed(1)} / 10`}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>{evaluation.summary}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {DIMENSION_ORDER.map((dimension) => {
                  const result = evaluation.dimensions[dimension];
                  if (!result) return null;
                  return (
                    <div key={dimension} className="rounded-lg border p-3 space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{labelForDimension(dimension)}</span>
                        <span className="text-sm font-semibold">
                          {result.available && result.score !== null ? `${result.score.toFixed(1)} / 10` : "Unavailable"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{result.explanation}</p>
                      {!result.available && result.unavailable_reason && (
                        <p className="text-xs text-muted-foreground">{result.unavailable_reason}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {(evaluation.strengths.length > 0 || evaluation.improvements.length > 0 || evaluation.retry_recommendations.length > 0) && (
            <div className="grid gap-4 md:grid-cols-3">
              <CoachingList title="Strengths" items={evaluation.strengths} icon={<CheckCircle2 className="h-4 w-4 text-green-600" />} />
              <CoachingList title="Next improvements" items={evaluation.improvements} icon={<Lightbulb className="h-4 w-4 text-amber-600" />} />
              <CoachingList title="Retry recommendations" items={evaluation.retry_recommendations} icon={<RefreshCw className="h-4 w-4 text-primary" />} />
            </div>
          )}

          {evaluation.answer_evaluations.map((answer, index) => (
            <Card key={answer.response_id}>
              <CardHeader>
                <CardTitle className="text-base">Answer {index + 1} coaching</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold">Corrected answer</h4>
                  <p className="mt-1 rounded-md bg-muted/50 p-3 whitespace-pre-wrap">{answer.corrected_answer}</p>
                </div>
                {answer.corrections.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold">Individual corrections</h4>
                    <ul className="mt-2 space-y-3">
                      {answer.corrections.map((correction, correctionIndex) => (
                        <li key={`${answer.response_id}-${correctionIndex}`} className="rounded-md border p-3 text-sm">
                          <p className="font-medium capitalize">{labelForDimension(correction.category)}</p>
                          <p><span className="text-muted-foreground">Original:</span> {correction.original}</p>
                          <p><span className="text-muted-foreground">Corrected:</span> {correction.corrected}</p>
                          <p className="mt-1 text-muted-foreground">{correction.explanation}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <CoachingList title="Answer strengths" items={answer.strengths} icon={<CheckCircle2 className="h-4 w-4 text-green-600" />} />
                <CoachingList title="Try next time" items={[...answer.improvements, ...answer.retry_recommendations]} icon={<Lightbulb className="h-4 w-4 text-amber-600" />} />
                {answer.explanations.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold">Explanation</h4>
                    {answer.explanations.map((explanation, explanationIndex) => (
                      <p key={`${answer.response_id}-explanation-${explanationIndex}`} className="text-sm text-muted-foreground">{explanation}</p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

function CoachingList({ title, items, icon }: { title: string; items: string[]; icon: React.ReactNode }) {
  if (items.length === 0) return null;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">{icon}{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm">
          {items.map((item, index) => <li key={`${title}-${index}`}>• {item}</li>)}
        </ul>
      </CardContent>
    </Card>
  );
}
