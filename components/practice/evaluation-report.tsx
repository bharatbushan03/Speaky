"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  Loader2,
  RefreshCw,
  Cpu,
  Languages,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Volume2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SessionEvaluation, EvaluationDimension, DimensionScore } from "@/lib/types/session-api";

interface EvaluationReportProps {
  evaluation: SessionEvaluation | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

const TECHNICAL_DIMENSIONS: EvaluationDimension[] = [
  "technical_correctness",
  "relevance",
];

const VERBAL_DIMENSIONS: EvaluationDimension[] = [
  "spoken_fluency",
  "grammar",
  "vocabulary",
  "clarity",
  "coherence",
  "interview_technique",
];

function labelForDimension(dimension: EvaluationDimension) {
  const customLabels: Record<string, string> = {
    technical_correctness: "Technical Correctness & Accuracy",
    relevance: "Relevance & Problem Solving",
    spoken_fluency: "Spoken Fluency & Delivery",
    grammar: "English Grammar & Syntax",
    vocabulary: "Vocabulary & Domain Diction",
    clarity: "Speech Clarity & Articulation",
    coherence: "Logical Flow & Coherence",
    interview_technique: "Interview Technique & Polish",
  };
  return customLabels[dimension] || dimension.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function calculateAverage(
  dimensions: Partial<Record<EvaluationDimension, DimensionScore>> | Record<EvaluationDimension, DimensionScore>,
  keys: EvaluationDimension[]
): number | null {
  const scores = keys
    .map((k) => dimensions[k])
    .filter((d): d is DimensionScore => Boolean(d && d.available && d.score !== null))
    .map((d) => d.score as number);
  if (scores.length === 0) return null;
  return Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1));
}

function scoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 8.0) return "text-green-600";
  if (score >= 6.5) return "text-blue-600";
  if (score >= 5.0) return "text-amber-600";
  return "text-destructive";
}

export function EvaluationReport({ evaluation, isLoading, error, onRetry }: EvaluationReportProps) {
  const [activeTab, setActiveTab] = useState<"all" | "technical" | "english">("all");

  if (isLoading) {
    return (
      <Card className="border-primary/20 bg-muted/20">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center" role="status">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <h3 className="text-lg font-semibold">Evaluating Your Performance</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Analyzing answers first from a <strong>Technical point of view</strong>, then assessing your <strong>English and verbal communication</strong>...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="space-y-4 py-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-destructive mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold">Evaluation Could Not Be Generated</h3>
              <p role="alert" className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
          <Button variant="outline" onClick={onRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Retry Evaluation
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!evaluation) return null;

  const technicalAvg = calculateAverage(evaluation.dimensions, TECHNICAL_DIMENSIONS);
  const verbalAvg = calculateAverage(evaluation.dimensions, VERBAL_DIMENSIONS);

  // Partition strengths & improvements
  const technicalStrengths = evaluation.strengths.filter((s) => /tech|concept|accur|solut|domain/i.test(s));
  const otherStrengths = evaluation.strengths.filter((s) => !/tech|concept|accur|solut|domain/i.test(s));
  const technicalImprovements = evaluation.improvements.filter((s) => /tech|concept|trade-off|accur|domain|edge/i.test(s));
  const otherImprovements = evaluation.improvements.filter((s) => !/tech|concept|trade-off|accur|domain|edge/i.test(s));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Banner: Score & Two-Phase Summary */}
      <Card className="border-primary/40 bg-gradient-to-br from-background via-muted/30 to-background shadow-md">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-5 w-5 text-primary" />
                <Badge variant="outline" className="text-xs uppercase tracking-wide">
                  Structured AI Coaching
                </Badge>
              </div>
              <CardTitle className="text-2xl font-bold">Interview Performance Evaluation</CardTitle>
              <CardDescription className="text-sm">
                Answers evaluated sequentially: <strong>1. Technical Point of View</strong> &bull; <strong>2. English & Verbal Communication</strong>
              </CardDescription>
            </div>

            <div className="flex items-center gap-6 self-stretch md:self-auto justify-around bg-card p-4 rounded-xl border">
              <div className="text-center">
                <div className="text-xs text-muted-foreground uppercase font-semibold">Overall</div>
                <div className={`text-3xl font-extrabold ${scoreColor(evaluation.overall_score)}`}>
                  {evaluation.overall_score !== null ? `${evaluation.overall_score.toFixed(1)}` : "—"}
                  <span className="text-xs text-muted-foreground font-normal">/10</span>
                </div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <div className="text-xs text-muted-foreground uppercase font-semibold flex items-center gap-1 justify-center">
                  <Cpu className="h-3 w-3 text-blue-600" /> Technical
                </div>
                <div className={`text-2xl font-bold ${scoreColor(technicalAvg)}`}>
                  {technicalAvg !== null ? `${technicalAvg.toFixed(1)}` : "N/A"}
                  <span className="text-xs text-muted-foreground font-normal">/10</span>
                </div>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="text-center">
                <div className="text-xs text-muted-foreground uppercase font-semibold flex items-center gap-1 justify-center">
                  <Languages className="h-3 w-3 text-purple-600" /> English/Verbal
                </div>
                <div className={`text-2xl font-bold ${scoreColor(verbalAvg)}`}>
                  {verbalAvg !== null ? `${verbalAvg.toFixed(1)}` : "N/A"}
                  <span className="text-xs text-muted-foreground font-normal">/10</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed bg-muted/40 p-4 rounded-lg border">
            {evaluation.summary}
          </p>
        </CardContent>
      </Card>

      {/* PHASE 1: TECHNICAL POINT OF VIEW (EVALUATED FIRST) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              Phase 1: Technical Point of View Evaluation
              <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-xs">Evaluated First</Badge>
            </h3>
            <p className="text-xs text-muted-foreground">
              Evaluates technical correctness, accuracy, depth of knowledge, and solution problem-solving.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {TECHNICAL_DIMENSIONS.map((dimension) => {
            const result = evaluation.dimensions[dimension];
            if (!result) return null;
            return (
              <Card key={dimension} className="border-blue-100 dark:border-blue-950 bg-blue-50/20">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{labelForDimension(dimension)}</span>
                    <Badge variant="outline" className={`font-mono font-bold ${scoreColor(result.score)}`}>
                      {result.available && result.score !== null ? `${result.score.toFixed(1)} / 10` : "Unavailable"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{result.explanation}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Technical Strengths and Gaps */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-green-200 dark:border-green-950 bg-green-50/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" /> Technical Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {(technicalStrengths.length > 0 ? technicalStrengths : evaluation.strengths.slice(0, 2)).map((s, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-green-600 font-bold">&bull;</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-amber-200 dark:border-amber-950 bg-amber-50/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <Lightbulb className="h-4 w-4" /> Technical Gaps & Next Focus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {(technicalImprovements.length > 0 ? technicalImprovements : evaluation.improvements.slice(0, 2)).map((imp, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-600 font-bold">&bull;</span>
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* PHASE 2: ENGLISH & VERBAL LANGUAGE EVALUATION */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
            <Languages className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              Phase 2: English & Verbal Language Evaluation
              <Badge variant="secondary" className="text-xs">Evaluated Second</Badge>
            </h3>
            <p className="text-xs text-muted-foreground">
              Evaluates spoken fluency, English grammar, professional vocabulary, clarity, and verbal delivery.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VERBAL_DIMENSIONS.map((dimension) => {
            const result = evaluation.dimensions[dimension];
            if (!result) return null;
            return (
              <Card key={dimension} className="border-purple-100 dark:border-purple-950 bg-purple-50/20">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{labelForDimension(dimension)}</span>
                    <Badge variant="outline" className={`font-mono font-bold ${scoreColor(result.score)}`}>
                      {result.available && result.score !== null ? `${result.score.toFixed(1)} / 10` : "Unavailable"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground leading-relaxed">{result.explanation}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* English & Verbal Recommendations */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-blue-200 dark:border-blue-950 bg-blue-50/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <Volume2 className="h-4 w-4" /> Verbal Communication Polish
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {(otherImprovements.length > 0 ? otherImprovements : evaluation.improvements.slice(1, 3)).map((imp, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">&bull;</span>
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-primary">
                <TrendingUp className="h-4 w-4" /> Recommended Practice Exercises
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {evaluation.retry_recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <ArrowRight className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* PER-QUESTION ANSWER COACHING */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold border-b pb-2">Per-Question Coaching & English Corrections</h3>
        <div className="space-y-4">
          {evaluation.answer_evaluations.map((answer, index) => (
            <Card key={answer.response_id || index} className="overflow-hidden border">
              <CardHeader className="bg-muted/40 py-3 px-4 border-b">
                <CardTitle className="text-base font-semibold flex items-center justify-between">
                  <span>Question {index + 1} Assessment</span>
                  <Badge variant="outline" className="text-xs">Detailed Breakdown</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* 1. Technical Assessment for this answer */}
                <div className="rounded-lg border border-blue-200/60 bg-blue-50/20 p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-semibold text-sm">
                    <Cpu className="h-4 w-4" />
                    <span>Technical Evaluation</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {answer.explanations?.[0] || "Your technical answer demonstrated a sound conceptual foundation."}
                  </p>
                </div>

                {/* 2. English & Verbal Assessment for this answer */}
                <div className="rounded-lg border border-purple-200/60 bg-purple-50/20 p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-400 font-semibold text-sm">
                    <Languages className="h-4 w-4" />
                    <span>English & Verbal Evaluation</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {answer.explanations?.[1] || answer.explanations?.[0] || "Clear verbal communication with natural articulation."}
                  </p>

                  {/* Polished sentence */}
                  {answer.corrected_answer && (
                    <div className="mt-2 pt-2 border-t border-purple-200/50">
                      <div className="text-xs font-semibold text-purple-800 dark:text-purple-300 mb-1">
                        ✨ Polished English Version (Preserving Your Exact Meaning):
                      </div>
                      <p className="text-sm bg-background p-2.5 rounded border text-foreground italic">
                        {`"${answer.corrected_answer}"`}
                      </p>
                    </div>
                  )}
                </div>

                {/* Individual Corrections if available */}
                {answer.corrections && answer.corrections.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Individual Language Corrections
                    </h5>
                    <div className="grid gap-2">
                      {answer.corrections.map((corr, cIdx) => (
                        <div key={cIdx} className="rounded border p-2.5 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-primary capitalize">{corr.category}</span>
                          </div>
                          <div><span className="text-muted-foreground">Said:</span> <del className="text-destructive">{corr.original}</del></div>
                          <div><span className="text-muted-foreground">Better:</span> <span className="text-green-600 font-medium">{corr.corrected}</span></div>
                          <p className="text-muted-foreground italic mt-0.5">{corr.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
