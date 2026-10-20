import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Type, Send, Edit2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface TextAnswerInputProps {
  initialValue?: string;
  onSubmit: (answer: string) => Promise<boolean>;
  isSubmitted: boolean;
  onEdit?: () => void;
  disabled?: boolean;
}

const MAX_CHARS = 2000;
const RECOMMENDED_MIN_CHARS = 100;

export function TextAnswerInput({
  initialValue = "",
  onSubmit,
  isSubmitted,
  onEdit,
  disabled = false,
}: TextAnswerInputProps) {
  const [answer, setAnswer] = useState(initialValue);
  const [isEditing, setIsEditing] = useState(!isSubmitted);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    setAnswer(initialValue);
    setIsEditing(!isSubmitted);
  }, [initialValue, isSubmitted]);

  const handleSubmit = async () => {
    if (disabled || submittingRef.current || !answer.trim() || answer.length > MAX_CHARS) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      if (await onSubmit(answer.trim())) setIsEditing(false);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    onEdit?.();
  };

  const charCount = answer.length;
  const isLongEnough = charCount >= RECOMMENDED_MIN_CHARS;
  const isOverLimit = charCount > MAX_CHARS;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Type className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Your Answer</CardTitle>
          </div>
          {isSubmitted && !isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEdit}
              disabled={disabled || isSubmitting}
              className="gap-2"
            >
              <Edit2 className="h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Text Area */}
        <div className="relative">
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer here... Be clear, concise, and provide relevant examples."
            className={cn(
              "min-h-[200px] resize-y",
              !isEditing && "bg-muted/50 cursor-default",
              isOverLimit && "border-destructive focus-visible:ring-destructive"
            )}
            disabled={!isEditing || disabled || isSubmitting}
            maxLength={MAX_CHARS}
          />
        </div>

        {/* Character Count and Guidelines */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span
              className={cn(
                "font-medium",
                isOverLimit
                  ? "text-destructive"
                  : isLongEnough
                  ? "text-green-600 dark:text-green-400"
                  : "text-muted-foreground"
              )}
            >
              {charCount} / {MAX_CHARS} characters
            </span>
            {!isLongEnough && charCount > 0 && (
              <span className="text-muted-foreground">
                (Recommended: {RECOMMENDED_MIN_CHARS}+ characters)
              </span>
            )}
          </div>
        </div>

        {/* Submit Button */}
        {isEditing && (
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSubmit}
              disabled={answer.trim().length === 0 || isOverLimit || disabled || isSubmitting}
              className="gap-2"
              size="lg"
            >
              {isSubmitting ? "Saving..." : isSubmitted ? (
                <>
                  <Check className="h-4 w-4" />
                  Update Answer
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Answer
                </>
              )}
            </Button>
            {!isSubmitted && (
              <p className="text-sm text-muted-foreground">
                You can edit your answer after submitting
              </p>
            )}
          </div>
        )}

        {/* Submitted State Message */}
        {isSubmitted && !isEditing && (
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <p className="text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
              <Check className="h-4 w-4" />
              Answer submitted. You can edit it or move to the next question.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
