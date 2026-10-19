import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PracticeSessionConfig,
  PRACTICE_MODE_CONFIG,
  PROFICIENCY_LEVELS,
  DIFFICULTY_LEVELS,
  EXPLANATION_LANGUAGES,
} from "@/lib/types/practice";
import {
  Briefcase,
  GraduationCap,
  BookOpen,
  User,
  BarChart3,
  MessageSquare,
  Hash,
  Globe,
  Target,
} from "lucide-react";

interface SessionSummaryProps {
  config: PracticeSessionConfig;
}

export function SessionSummary({ config }: SessionSummaryProps) {
  const modeConfig = PRACTICE_MODE_CONFIG[config.mode];
  
  const getModeIcon = () => {
    switch (config.mode) {
      case "hr":
        return <Briefcase className="h-5 w-5" />;
      case "technical":
        return <BookOpen className="h-5 w-5" />;
      case "viva":
        return <GraduationCap className="h-5 w-5" />;
    }
  };

  const getProficiencyLabel = () => {
    return PROFICIENCY_LEVELS.find((l) => l.value === config.proficiencyLevel)?.label;
  };

  const getDifficultyLabel = () => {
    return DIFFICULTY_LEVELS.find((l) => l.value === config.difficulty)?.label;
  };

  const getLanguageLabel = () => {
    return EXPLANATION_LANGUAGES.find((l) => l.value === config.explanationLanguage)?.label;
  };

  return (
    <Card className="border-2 border-primary/20 bg-primary/5">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            {getModeIcon()}
          </div>
          <div>
            <CardTitle className="text-lg">Session Summary</CardTitle>
            <CardDescription>Review your configuration before starting</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Practice Mode */}
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-background p-2">
            {getModeIcon()}
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm text-muted-foreground">Practice Mode</div>
            <div className="font-semibold">{modeConfig.title}</div>
          </div>
        </div>

        {/* Role or Subject */}
        {config.jobRole && (
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-background p-2">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm text-muted-foreground">Job Role</div>
              <div className="font-semibold">{config.jobRole}</div>
            </div>
          </div>
        )}

        {config.subject && (
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-background p-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm text-muted-foreground">Academic Subject</div>
              <div className="font-semibold">{config.subject}</div>
            </div>
          </div>
        )}

        {/* Proficiency and Difficulty */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-background p-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm text-muted-foreground">Proficiency</div>
              <div className="font-semibold">{getProficiencyLabel()}</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="rounded-md bg-background p-2">
              <Target className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm text-muted-foreground">Difficulty</div>
              <div className="font-semibold">{getDifficultyLabel()}</div>
            </div>
          </div>
        </div>

        {/* Interaction Mode */}
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-background p-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm text-muted-foreground">Interaction Mode</div>
            <div className="flex items-center gap-2">
              <span className="font-semibold capitalize">{config.interactionMode}</span>
              <Badge variant="secondary" className="text-xs">
                {config.interactionMode === "voice" ? "🎤 Voice" : "⌨️ Text"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Question Count and Language */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-background p-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm text-muted-foreground">Questions</div>
              <div className="font-semibold">{config.questionCount}</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="rounded-md bg-background p-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm text-muted-foreground">Language</div>
              <div className="font-semibold text-sm">{getLanguageLabel()}</div>
            </div>
          </div>
        </div>

        {/* Topic Focus */}
        {config.topicFocus && (
          <div className="flex items-start gap-3 pt-2 border-t">
            <div className="rounded-md bg-background p-2">
              <Target className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm text-muted-foreground">Topic Focus</div>
              <div className="font-semibold">{config.topicFocus}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
