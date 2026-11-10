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
import { Mic, Type, AlertCircle, Sparkles, Check, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionConfigFormProps {
  mode: PracticeMode;
  onStartSession: (config: PracticeSessionConfig) => Promise<void>;
  isStarting?: boolean;
  startError?: string | null;
}

const ROLE_SUGGESTIONS: Record<string, string[]> = {
  hr: [
    "Software Engineer",
    "Product Manager",
    "Data Analyst",
    "Consultant",
    "Marketing Manager",
    "Fresh Graduate / Entry Level",
  ],
  technical: [
    "Full Stack Engineer",
    "Backend Developer",
    "Frontend Engineer",
    "DevOps & Cloud Architect",
    "Data Scientist",
    "Mobile App Developer",
  ],
  viva: [
    "Computer Science",
    "Artificial Intelligence",
    "Mechanical Engineering",
    "Biotechnology",
    "Business Administration",
    "Economics & Finance",
  ],
};

const ENGLISH_TOPIC_PRESETS = [
  {
    label: "🗣️ Daily Conversations & Small Talk",
    topic: "Casual daily small talk, weather, routines, and making new friends",
  },
  {
    label: "💼 Workplace & Professional Communication",
    topic: "Office meetings, presenting ideas, speaking up in discussions, and professional tone",
  },
  {
    label: "💡 Expressing Opinions & Constructive Debates",
    topic: "Sharing perspectives, agreeing/disagreeing politely, and explaining your point of view",
  },
  {
    label: "📖 Storytelling & Personal Experiences",
    topic: "Describing memorable life events, challenges overcome, and personal stories with flow",
  },
  {
    label: "✈️ Travel, Culture & Social Situations",
    topic: "Ordering food, asking for directions, exploring places, and social interactions abroad",
  },
  {
    label: "🎯 Confident Self-Introduction & Networking",
    topic: "Introducing yourself naturally, networking events, elevator pitches, and personal background",
  },
];

export function SessionConfigForm({
  mode,
  onStartSession,
  isStarting = false,
  startError,
}: SessionConfigFormProps) {
  const modeConfig = PRACTICE_MODE_CONFIG[mode];

  const [config, setConfig] = useState<Partial<PracticeSessionConfig>>({
    mode,
    ...DEFAULT_CONFIG,
    jobRole: mode === "english" ? "English Communication & Fluency Practice" : "",
    questionCount: modeConfig?.defaultQuestions || 5,
  });

  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  const updateConfig = <K extends keyof PracticeSessionConfig>(
    key: K,
    value: PracticeSessionConfig[K]
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
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
      const payload: PracticeSessionConfig = {
        mode,
        jobRole:
          mode === "english"
            ? config.jobRole || "English Communication & Fluency Practice"
            : config.jobRole,
        subject: config.subject,
        proficiencyLevel: config.proficiencyLevel || "intermediate",
        difficulty: config.difficulty || "medium",
        interactionMode: config.interactionMode || "voice",
        questionCount: config.questionCount || 5,
        explanationLanguage: config.explanationLanguage || "english",
        topicFocus: config.topicFocus,
      };
      await onStartSession(payload);
    } finally {
      setIsValidating(false);
    }
  };

  const getErrorMessage = (field: string): string | undefined => {
    return errors.find((error) => error.field === field)?.message;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border bg-card/60 p-4 text-sm text-muted-foreground backdrop-blur flex items-center justify-between">
        <span>
          Questions are dynamically adapted to your answers with follow-ups in real-time.
        </span>
        <Badge variant="outline" className="capitalize shrink-0 ml-2">
          {modeConfig?.title}
        </Badge>
      </div>

      {startError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Unable to start session</p>
            <p>{startError}</p>
          </div>
        </div>
      )}

      <fieldset disabled={isStarting || isValidating} className="space-y-6">
        {/* ENGLISH PRACTICE TOPIC FOCUS */}
        {mode === "english" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-lg">Conversation Topic & Focus</CardTitle>
              </div>
              <CardDescription>
                Choose what kind of English conversation you want to practice today
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-2.5">
                {ENGLISH_TOPIC_PRESETS.map((preset) => {
                  const isSelected = config.topicFocus === preset.topic;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => updateConfig("topicFocus", preset.topic)}
                      className={cn(
                        "text-left p-3 rounded-lg border text-sm transition-all flex flex-col justify-between hover:border-primary/50",
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary text-foreground font-medium"
                          : "bg-card text-muted-foreground hover:bg-muted/40"
                      )}
                    >
                      <span className="font-semibold text-foreground text-xs mb-1">
                        {preset.label}
                      </span>
                      <span className="text-xs text-muted-foreground line-clamp-2">
                        {preset.topic}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2 pt-2">
                <Label htmlFor="customEnglishTopic">
                  Or enter a specific topic <span className="text-muted-foreground">(Optional)</span>
                </Label>
                <Input
                  id="customEnglishTopic"
                  maxLength={300}
                  placeholder="e.g., Ordering coffee, Discussing favorite movies, Negotiating salary"
                  value={config.topicFocus || ""}
                  onChange={(e) => updateConfig("topicFocus", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* JOB ROLE FOR HR AND TECHNICAL */}
        {(mode === "hr" || mode === "technical") && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Target Job Role</CardTitle>
              <CardDescription>
                What position or career path are you preparing for?
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
                  placeholder="e.g., Software Engineer, Product Manager, Data Analyst"
                  value={config.jobRole || ""}
                  onChange={(e) => updateConfig("jobRole", e.target.value)}
                  className={cn(getErrorMessage("jobRole") && "border-destructive")}
                />
                {getErrorMessage("jobRole") && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>{getErrorMessage("jobRole")}</span>
                  </div>
                )}
              </div>

              {/* Quick suggestion pills */}
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Popular roles:</span>
                <div className="flex flex-wrap gap-1.5">
                  {ROLE_SUGGESTIONS[mode]?.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => updateConfig("jobRole", role)}
                      className={cn(
                        "text-xs px-2.5 py-1 rounded-full border transition-colors",
                        config.jobRole === role
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ACADEMIC SUBJECT FOR VIVA */}
        {mode === "viva" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Academic Subject or Thesis Field</CardTitle>
              <CardDescription>
                What subject or research area is your viva focused on?
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
                  placeholder="e.g., Computer Science, Deep Learning, Economics, Mechanical Engineering"
                  value={config.subject || ""}
                  onChange={(e) => updateConfig("subject", e.target.value)}
                  className={cn(getErrorMessage("subject") && "border-destructive")}
                />
                {getErrorMessage("subject") && (
                  <div className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>{getErrorMessage("subject")}</span>
                  </div>
                )}
              </div>

              {/* Quick suggestion pills */}
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Common fields:</span>
                <div className="flex flex-wrap gap-1.5">
                  {ROLE_SUGGESTIONS.viva.map((sub) => (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => updateConfig("subject", sub)}
                      className={cn(
                        "text-xs px-2.5 py-1 rounded-full border transition-colors",
                        config.subject === sub
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {sub}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PROFICIENCY AND DIFFICULTY */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Proficiency & Difficulty</CardTitle>
            <CardDescription>
              Match the interview questions to your current skill level
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Proficiency Level */}
            <div className="space-y-3">
              <Label>Your English Speaking Level</Label>
              <RadioGroup
                value={config.proficiencyLevel}
                onValueChange={(value: string) => updateConfig("proficiencyLevel", value as any)}
                className="grid sm:grid-cols-3 gap-3"
              >
                {PROFICIENCY_LEVELS.map((level) => (
                  <label
                    key={level.value}
                    className={cn(
                      "flex flex-col space-y-1.5 rounded-lg border p-4 cursor-pointer transition-all hover:bg-accent hover:border-primary/50",
                      config.proficiencyLevel === level.value && "border-primary bg-primary/5 ring-1 ring-primary"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{level.label}</span>
                      <RadioGroupItem value={level.value} />
                    </div>
                    <span className="text-xs text-muted-foreground">{level.description}</span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* Difficulty Level */}
            <div className="space-y-2">
              <Label>Question Complexity</Label>
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
                      <span className="font-medium mr-2">{level.label}</span>
                      <span className="text-xs text-muted-foreground">({level.description})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* INTERACTION MODE */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Practice Method</CardTitle>
            <CardDescription>Choose how you want to interact during this session</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <RadioGroup
              value={config.interactionMode}
              onValueChange={(value: string) => updateConfig("interactionMode", value as any)}
              className="grid sm:grid-cols-2 gap-4"
            >
              <label
                className={cn(
                  "relative flex flex-col items-center space-y-3 rounded-xl border-2 p-6 cursor-pointer transition-all hover:border-primary hover:shadow-md",
                  config.interactionMode === "voice"
                    ? "border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20"
                    : "border-border hover:bg-accent/40"
                )}
              >
                <RadioGroupItem value="voice" className="sr-only" />
                <div className="rounded-full bg-emerald-500/15 p-4 text-emerald-600">
                  <Mic className="h-8 w-8 text-emerald-600" />
                </div>
                <div className="text-center">
                  <div className="font-semibold mb-1 flex items-center justify-center gap-1.5">
                    <span>Live Voice Interview</span>
                    <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 text-[10px]">
                      Recommended
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    AI speaks questions aloud &bull; Speak your answers into mic
                  </div>
                </div>
              </label>

              <label
                className={cn(
                  "relative flex flex-col items-center space-y-3 rounded-xl border-2 p-6 cursor-pointer transition-all hover:border-primary hover:shadow-md",
                  config.interactionMode === "text"
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:bg-accent/40"
                )}
              >
                <RadioGroupItem value="text" className="sr-only" />
                <div className="rounded-full bg-primary/10 p-4 text-primary">
                  <Type className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center">
                  <div className="font-semibold mb-1">Text-Based Practice</div>
                  <div className="text-xs text-muted-foreground">
                    Read written questions & type your answers at your own pace
                  </div>
                </div>
              </label>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* SESSION SETTINGS */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Session Settings</CardTitle>
            <CardDescription>Adjust length and coaching language preference</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Question Count */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Number of Questions</Label>
                  <p className="text-xs text-muted-foreground">
                    Estimated duration: ~{(config.questionCount || 5) * 2} minutes
                  </p>
                </div>
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
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Quick ({modeConfig.minQuestions} questions)</span>
                <span>Standard (5 questions)</span>
                <span>In-depth ({modeConfig.maxQuestions} questions)</span>
              </div>
            </div>

            {/* Explanation Language */}
            <div className="space-y-2">
              <Label>Explanation & Feedback Language</Label>
              <Select
                value={config.explanationLanguage}
                onValueChange={(value) => updateConfig("explanationLanguage", value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select coaching language" />
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
                Questions are always asked in English; coaching reports and guidance can be explained in your regional language.
              </p>
            </div>

            {/* Optional Topic Focus for HR/Tech */}
            {mode !== "english" && (
              <div className="space-y-2">
                <Label htmlFor="topicFocus">
                  Specific Skill or Sub-topic Focus <span className="text-muted-foreground">(Optional)</span>
                </Label>
                <Input
                  id="topicFocus"
                  maxLength={500}
                  placeholder={
                    mode === "hr"
                      ? "e.g., Conflict resolution, STAR leadership stories, Salary negotiation"
                      : mode === "technical"
                      ? "e.g., Microservices architecture, Database indexing, React performance"
                      : "e.g., Methodology defense, Literature review, Experimental design"
                  }
                  value={config.topicFocus || ""}
                  onChange={(e) => updateConfig("topicFocus", e.target.value)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submit Actions */}
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
            className="gap-2 px-8 shadow-md"
          >
            {isStarting ? "Preparing Your Session..." : "Start Practice Session"}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
