"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import {
  PracticeMode,
  PracticeSessionConfig,
  ValidationError,
  PRACTICE_MODE_CONFIG,
  PROFICIENCY_LEVELS,
  DIFFICULTY_LEVELS,
  EXPLANATION_LANGUAGES,
  DEFAULT_CONFIG,
} from "@/lib/types/practice";
import { Mic, Type, AlertCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionConfigFormProps {
  mode: PracticeMode;
  onStartSession: (config: PracticeSessionConfig) => Promise<void>;
  isStarting?: boolean;
  startError?: string | null;
}

export function SessionConfigForm({ mode, onStartSession, isStarting = false, startError }: SessionConfigFormProps) {
  const modeConfig = PRACTICE_MODE_CONFIG[mode];
  
  const [config, setConfig] = useState<Partial<PracticeSessionConfig>>({
    mode,
    ...DEFAULT_CONFIG,
    questionCount: modeConfig.defaultQuestions,
  });

  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  const updateConfig = <K extends keyof PracticeSessionConfig>(
    key: K,
    value: PracticeSessionConfig[K]
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    // Clear error for this field
    setErrors((prev) => prev.filter((error) => error.field !== key));
  };

  const validateConfig = (): boolean => {
    const newErrors: ValidationError[] = [];

    // Validate job role for HR and Technical
    if ((mode === "hr" || mode === "technical") && !config.jobRole?.trim()) {
      newErrors.push({
        field: "jobRole",
        message: "Job role is required",
      });
    }

    // Validate subject for Academic Viva
    if (mode === "viva" && !config.subject?.trim()) {
      newErrors.push({
        field: "subject",
        message: "Academic subject is required",
      });
    }

    // Validate question count
    if (
      !config.questionCount ||
      config.questionCount < modeConfig.minQuestions ||
      config.questionCount > modeConfig.maxQuestions
    ) {
      newErrors.push({
        field: "questionCount",
        message: `Question count must be between ${modeConfig.minQuestions} and ${modeConfig.maxQuestions}`,
      });
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isStarting || isValidating || !validateConfig()) return;
    setIsValidating(true);
    try {
      await onStartSession(config as PracticeSessionConfig);
    } finally {
      setIsValidating(false);
    }
  };

  const getErrorMessage = (field: string): string | undefined => {
    return errors.find((error) => error.field === field)?.message;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Questions come from a static practice bank, not AI generation. Questions may repeat in longer sessions.
      </p>
      {startError && <p role="alert" className="text-sm text-destructive">{startError}</p>}
      <fieldset disabled={isStarting || isValidating} className="space-y-6">
      {/* Job Role or Subject */}
      {(mode === "hr" || mode === "technical") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Job Role</CardTitle>
            <CardDescription>
              What position are you preparing for?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jobRole">
                Job Title or Role <span className="text-destructive">*</span>
              </Label>
              <Input
                id="jobRole"
                maxLength={255}
                placeholder="e.g., Software Engineer, Data Analyst, Product Manager"
                value={config.jobRole || ""}
                onChange={(e) => updateConfig("jobRole", e.target.value)}
                className={cn(
                  getErrorMessage("jobRole") && "border-destructive"
                )}
              />
              {getErrorMessage("jobRole") && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{getErrorMessage("jobRole")}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Your role is saved with the session and used in question templates where supported
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {mode === "viva" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Academic Subject</CardTitle>
            <CardDescription>
              What subject is your viva focused on?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">
                Subject or Research Area <span className="text-destructive">*</span>
              </Label>
              <Input
                id="subject"
                maxLength={255}
                placeholder="e.g., Computer Science, Physics, Literature"
                value={config.subject || ""}
                onChange={(e) => updateConfig("subject", e.target.value)}
                className={cn(
                  getErrorMessage("subject") && "border-destructive"
                )}
              />
              {getErrorMessage("subject") && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{getErrorMessage("subject")}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Questions will be customized for this academic field
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Proficiency and Difficulty */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Level</CardTitle>
          <CardDescription>
            Help us match the right difficulty for you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Proficiency Level */}
          <div className="space-y-3">
            <Label>English Proficiency</Label>
            <RadioGroup
              value={config.proficiencyLevel}
              onValueChange={(value: string) =>
                updateConfig("proficiencyLevel", value as any)
              }
              className="grid gap-3"
            >
              {PROFICIENCY_LEVELS.map((level) => (
                <label
                  key={level.value}
                  className={cn(
                    "flex items-start space-x-3 space-y-0 rounded-md border p-4 cursor-pointer transition-colors hover:bg-accent",
                    config.proficiencyLevel === level.value &&
                      "border-primary bg-accent"
                  )}
                >
                  <RadioGroupItem value={level.value} />
                  <div className="flex-1">
                    <div className="font-medium">{level.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {level.description}
                    </div>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Difficulty Level */}
          <div className="space-y-3">
            <Label>Question Difficulty</Label>
            <Select
              value={config.difficulty}
              onValueChange={(value) => updateConfig("difficulty", value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                {DIFFICULTY_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    <div className="flex flex-col items-start">
                      <span>{level.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {level.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Interaction Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Practice Method</CardTitle>
          <CardDescription>
            Choose how you want to practice
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <RadioGroup
            value={config.interactionMode}
            onValueChange={(value: string) =>
              updateConfig("interactionMode", value as any)
            }
            className="grid md:grid-cols-2 gap-4"
          >
            <label
              className={cn(
                "flex flex-col items-center space-y-3 rounded-lg border-2 p-6 cursor-pointer transition-all hover:border-primary hover:shadow-md",
                config.interactionMode === "text" &&
                  "border-primary bg-accent"
              )}
            >
              <RadioGroupItem value="text" className="sr-only" />
              <div className="rounded-full bg-primary/10 p-4">
                <Type className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center">
                <div className="font-semibold mb-1">Text Mode</div>
                <div className="text-sm text-muted-foreground">
                  Type your responses
                </div>
              </div>
              {config.interactionMode === "text" && (
                <Badge variant="secondary" className="mt-2">
                  Selected
                </Badge>
              )}
            </label>

            <label
              className={cn(
                "flex flex-col items-center space-y-3 rounded-lg border-2 p-6 cursor-pointer transition-all hover:border-primary hover:shadow-md",
                config.interactionMode === "voice" &&
                  "border-primary bg-accent"
              )}
            >
              <RadioGroupItem value="voice" className="sr-only" />
              <div className="rounded-full bg-primary/10 p-4">
                <Mic className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center">
                <div className="font-semibold mb-1">Voice Mode</div>
                <div className="text-sm text-muted-foreground">
                  Speak your responses
                </div>
              </div>
              {config.interactionMode === "voice" && (
                <Badge variant="secondary" className="mt-2">
                  Selected
                </Badge>
              )}
            </label>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Session Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Session Settings</CardTitle>
          <CardDescription>
            Customize your practice session
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Question Count */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Number of Questions</Label>
              <span className="text-2xl font-bold text-primary">
                {config.questionCount}
              </span>
            </div>
            <Slider
              value={[config.questionCount || modeConfig.defaultQuestions]}
              onValueChange={(value: number[]) => updateConfig("questionCount", value[0])}
              min={modeConfig.minQuestions}
              max={modeConfig.maxQuestions}
              step={1}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {modeConfig.minQuestions} - {modeConfig.maxQuestions} questions
            </p>
          </div>

          {/* Explanation Language */}
          <div className="space-y-2">
            <Label>Explanation Language</Label>
            <Select
              value={config.explanationLanguage}
              onValueChange={(value) =>
                updateConfig("explanationLanguage", value as any)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {EXPLANATION_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Saves your language preference and sets the voice transcription language. AI feedback is not available in this flow.
            </p>
          </div>

          {/* Optional Topic Focus */}
          <div className="space-y-2">
            <Label htmlFor="topicFocus">
              Specific Topic Focus <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Input
              id="topicFocus"
              maxLength={500}
              placeholder="e.g., Conflict resolution, Algorithms, Research ethics"
              value={config.topicFocus || ""}
              onChange={(e) => updateConfig("topicFocus", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Focus questions on a specific skill or topic area
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex items-center justify-between pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => window.history.back()}
        >
          Back
        </Button>
        <Button
          type="submit"
          size="lg"
          disabled={isValidating || isStarting}
          className="gap-2"
        >
          <Sparkles className="h-5 w-5" />
          {isStarting ? "Creating Session..." : "Start Practice Session"}
        </Button>
      </div>
      </fieldset>
    </form>
  );
}
