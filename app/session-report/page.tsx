"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { Progress, Skeleton } from "@/components/ui/progress";
import { Target, TrendingUp, Flame, Clock, BookOpen, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useParams } from "next/navigation";
import { useToast } from "@/components/ui/toast";

interface EvaluationDimensionScore {
  score: number | null;
  available: boolean;
  explanation: string;
  unavailable_reason?: string | null;
}

interface SessionResponseEvaluation {
  corrected_answer: string;
  explanations: string[];
  strengths: string[];
  improvements: string[];
  retry_recommendations: string[];
  corrections: { category: string; original: string; corrected: string; explanation: string }[];
}

interface SessionReportData {
  session_id: string;
  mode: string;
  topic: string | null;
  status: string;
  question_count: number;
  started_at: string | null;
  completed_at: string | null;
  overall_score: number | null;
  explanation_language: string;
  summary: string;
  strengths: string[];
  areas_for_improvement: string[];
  dimensions: Record<string, EvaluationDimensionScore>;
  answer_evaluations: Array<{
    question_id: string;
    question_text: string;
    user_answer: string;
    corrected_answer: string;
    strengths: string[];
    areas_for_improvement: string[];
    retry_recommendations: string[];
    score_by_dimension: Record<string, number | null>;
  }>;
}

export default function SessionReportPage() {
  const { id } = useParams();
  const [report, setReport] = useState<SessionReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    async function loadReport() {
      if (!id) {
        setError("Session ID is required");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/v1/sessions/${id}/report`, {
          credentials: "include",
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || "Failed to load session report");
        }

        const result = await response.json();
        setReport(result);
        setShowReport(true);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load session report");
        setLoading(false);
      }
    }

    loadReport();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12">
        <div className="bg-red-50 rounded-border p-6 max-w-md">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error</h3>
          <p className="text-red-600">{error}</p>
          <Button onClick={() => window.history.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12">
        <div className="bg-yellow-50 rounded-border p-6 max-w-md">
          <h3 className="text-lg font-medium text-yellow-800 mb-2">No Report</h3>
          <p className="text-yellow-600">
            This session has not been evaluated yet. Complete the session and generate an evaluation to see the report.
          </p>
          <Button onClick={() => window.history.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto px-4 py-8">
        <nav className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            ← Back to Sessions
          </Button>
        </nav>

        <Card>
          <CardHeader>
            <CardTitle>Session Report</CardTitle>
            <CardDescription>
              {report.mode} Practice - {report.topic || "No topic focus"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-muted-foreground">Mode</p>
                <p className="font-medium">{report.mode}</p>
              </div>
              <p className="text-sm text-muted-foreground">Topic</p>
              <p className="font-medium">{report.topic || "—"}</p>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-medium {
                report.status === "completed" ? "text-green-600" :
                report.status === "in_progress" ? "text-yellow-600" :
                "text-gray-500"
              }">
                {report.status}
              </p>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-medium">{report.started_at ? new Date(report.started_at).toLocaleDateString() : "—"}</p>
              {report.completed_at && (
                <p className="text-sm text-muted-foreground">
                  Completed: {new Date(report.completed_at).toLocaleDateString()}
                </p>
              )}
              <p className="text-sm text-muted-foreground">Language</p>
              <p className="font-medium">{report.explanation_language}</p>
            </div>

            {report.overall_score !== null && (
              <div className="mt-6 p-4 rounded-xl {
                report.overall_score >= 8 ? "bg-green-100" :
                report.overall_score >= 6 ? "bg-yellow-100" :
                "bg-red-100"
              }">
                <p className="text-4xl font-bold {report.overall_score >= 8 ? "text-green-600" : report.overall_score >= 6 ? "text-yellow-600" : "text-red-600"}">
                  {report.overall_score}
                </p>
                <p className="text-muted-foreground">Overall Score</p>
              </div>
            )}

            <p className="text-muted-foreground mt-4">{report.summary}</p>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Strengths</h4>
                <ul className="space-y-2 text-sm">
                  {report.strengths.map((strength, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-green-500 flex-shrink-0">✓</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground">Areas for Improvement</h4>
                <ul className="space-y-2 text-sm">
                  {report.areas_for_improvement.map((area, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-red-500 flex-shrink-0">⚠</span>
                      <span>{area}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dimensions Detail Section */}
        {report.overall_score !== null && report.dimensions && (
          <Card mt-8>
            <CardHeader>
              <CardTitle>Dimension Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <!---- Grammar -->
                <div>
                  <p className="text-xs text-muted-foreground">Grammar</p>
                  <Progress
                    value={report.dimensions.grammar.score !== null ? report.dimensions.grammar.score : 5}
                    className="h-4"
                  />
                  {report.dimensions.grammar.score !== null && (
                    <p className="text-xs {
                      report.dimensions.grammar.score >= 7 ? "text-green-600" :
                      report.dimensions.grammar.score >= 5 ? "text-yellow-600" : "text-red-600"
                    }">
                      {report.dimensions.grammar.score}/10
                    </p>
                  )}
                  {!report.dimensions.grammar.available && (
                    <p className="text-xs text-gray-400">Not available (no audio data)</p>
                  )}
                </div>

                <!---- Vocabulary -->
                <div>
                  <p className="text-xs text-muted-foreground">Vocabulary</p>
                  <Progress
                    value={report.dimensions.vocabulary.score !== null ? report.dimensions.vocabulary.score : 5}
                    className="h-4"
                  />
                  {report.dimensions.vocabulary.score !== null && (
                    <p className="text-xs {
                      report.dimensions.vocabulary.score >= 7 ? "text-green-600" :
                      report.dimensions.vocabulary.score >= 5 ? "text-yellow-600" : "text-red-600"
                    }">
                      {report.dimensions.vocabulary.score}/10
                    </p>
                  )}
                  {!report.dimensions.vocabulary.available && (
                    <p className="text-xs text-gray-400">Not available</p>
                  )}
                </div>

                <!---- Clarity -->
                <div>
                  <p className="text-xs text-muted-foreground">Clarity</p>
                  <Progress
                    value={report.dimensions.clarity.score !== null ? report.dimensions.clarity.score : 5}
                    className="h-4"
                  />
                  {report.dimensions.clarity.score !== null && (
                    <p className="text-xs {
                      report.dimensions.clarity.score >= 7 ? "text-green-600" :
                      report.dimensions.clarity.score >= 5 ? "text-yellow-600" : "text-red-600"
                    }">
                      {report.dimensions.clarity.score}/10
                    </p>
                  )}
                  {!report.dimensions.clarity.available && (
                    <p className="text-xs text-gray-400">Not available</p>
                  )}
                </div>

                <!---- Fluency -->
                <div>
                  <p className="text-xs text-muted-foreground">Fluency</p>
                  <Progress
                    value={report.dimensions["spoken_fluency"]?.score !== null ? report.dimensions["spoken_fluency"].score : 5}
                    className="h-4"
                  />
                  {report.dimensions["spoken_fluency"]?.score !== null && (
                    <p className="text-xs {
                      report.dimensions["spoken_fluency"]?.score >= 7 ? "text-green-600" :
                      report.dimensions["spoken_fluency"]?.score >= 5 ? "text-yellow-600" : "text-red-600"
                    }">
                      {report.dimensions["spoken_fluency"]?.score}/10
                    </p>
                  )}
                  {!report.dimensions["spoken_fluency"]?.available && (
                    <p className="text-xs text-gray-400">Not available (no audio data)</p>
                  )}
                </div>
              </div>
            </Card>
          </CardContent>
        </Card>

        {/* Answer Evaluations Detail */}
        <Card mt-8>
          <CardHeader>
            <CardTitle>Answer Evaluations</CardTitle>
          </CardHeader>
          <CardContent>
            {report.answer_evaluations.map((eval, idx) => (
              <div key={idx} className="border-b last:border-0 pb-4 mb-4">
                <p className="text-sm font-medium mb-2">
                  Question {eval.question_id}: {eval.question_text}
                </p>
                <p className="text-muted-foreground text-sm mb-2">
                  Your answer: {eval.user_answer}
                </p>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="font-medium text-muted-foreground">Grammar</p>
                    <Progress
                      value={eval.score_by_dimension.grammar !== null ? eval.score_by_dimension.grammar : 5}
                      className="h-3"
                    />
                    {eval.score_by_dimension.grammar !== null && (
                      <p className="text-xs {
                        eval.score_by_dimension.grammar >= 7 ? "text-green-600" :
                        eval.score_by_dimension.grammar >= 5 ? "text-yellow-600" : "text-red-600"
                      }">
                        {eval.score_by_dimension.grammar}/10
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground">Vocabulary</p>
                    <Progress
                      value={eval.score_by_dimension.vocabulary !== null ? eval.score_by_dimension.vocabulary : 5}
                      className="h-3"
                    />
                    {eval.score_by_dimension.vocabulary !== null && (
                      <p className="text-xs {
                        eval.score_by_dimension.vocabulary >= 7 ? "text-green-600" :
                        eval.score_by_dimension.vocabulary >= 5 ? "text-yellow-600" : "text-red-600"
                      }">
                        {eval.score_by_dimension.vocabulary}/10
                      </p>
                    )}
                  </div>
                </div>

                <p className="text-muted-foreground text-truncate mt-3">
                  <strong>AI Corrected Answer:</strong> {eval.corrected_answer}
                </p>

                <div className="mt-3">
                  <p className="font-medium text-muted-foreground">Strengths</p>
                  <ul className="space-y-1 text-xs">
                    {eval.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-3">
                  <p className="font-medium text-muted-foreground">Areas for Improvement</p>
                  <ul className="space-y-1 text-xs">
                    {eval.areas_for_improvement.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-3">
                  <p className="font-medium text-muted-foreground">Recommended Exercises</p>
                  <ul className="space-y-1 text-xs">
                    {eval.retry_recommendations.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}