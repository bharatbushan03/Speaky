import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Question } from "@/lib/types/session";
import { MessageSquare, Lightbulb, Info } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface QuestionDisplayProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  difficulty: string;
  mode: string;
}

export function QuestionDisplay({
  question,
  questionNumber,
  totalQuestions,
  difficulty,
  mode,
}: QuestionDisplayProps) {
  const [showHints, setShowHints] = useState(false);
  const [showContext, setShowContext] = useState(false);

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">
              Question {questionNumber} of {totalQuestions}
            </CardTitle>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="capitalize">
              {mode}
            </Badge>
            <Badge
              variant={
                difficulty === "hard"
                  ? "destructive"
                  : difficulty === "medium"
                  ? "default"
                  : "outline"
              }
              className="capitalize"
            >
              {difficulty}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Question Text */}
        <div className="bg-muted/50 rounded-lg p-6">
          <p className="text-lg font-medium leading-relaxed">{question.text}</p>
        </div>

        {/* Context and Hints Toggle Buttons */}
        <div className="flex flex-wrap gap-2">
          {question.context && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowContext(!showContext)}
              className="gap-2"
            >
              <Info className="h-4 w-4" />
              {showContext ? "Hide" : "Show"} Context
            </Button>
          )}
          {question.hints && question.hints.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHints(!showHints)}
              className="gap-2"
            >
              <Lightbulb className="h-4 w-4" />
              {showHints ? "Hide" : "Show"} Hints
            </Button>
          )}
        </div>

        {/* Context Display */}
        {showContext && question.context && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-1">
                  Context
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {question.context}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Hints Display */}
        {showHints && question.hints && question.hints.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-sm text-yellow-900 dark:text-yellow-100 mb-2">
                  Hints
                </h4>
                <ul className="space-y-1">
                  {question.hints.map((hint, index) => (
                    <li
                      key={index}
                      className="text-sm text-yellow-800 dark:text-yellow-200 flex items-start gap-2"
                    >
                      <span className="text-yellow-600 dark:text-yellow-400">•</span>
                      <span>{hint}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
