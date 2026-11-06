/**
 * Practice Session Types
 * Type definitions for practice session configuration
 */

export type PracticeMode = "hr" | "technical" | "viva" | "english";

export type ProficiencyLevel = "beginner" | "intermediate" | "advanced";

export type InteractionMode = "text" | "voice";

export type DifficultyLevel = "easy" | "medium" | "hard";

export type ExplanationLanguage = "english" | "hindi" | "tamil" | "telugu" | "bengali" | "kannada";

export interface PracticeSessionConfig {
  mode: PracticeMode;
  jobRole?: string; // For HR and Technical interviews
  subject?: string; // For Academic Viva
  proficiencyLevel: ProficiencyLevel;
  difficulty: DifficultyLevel;
  interactionMode: InteractionMode;
  questionCount: number;
  explanationLanguage: ExplanationLanguage;
  topicFocus?: string; // Optional specific topic or skill
}

export interface ValidationError {
  field: string;
  message: string;
}

export const PRACTICE_MODE_CONFIG = {
  hr: {
    title: "HR Interview",
    description: "Master behavioral questions, leadership scenarios, and workplace communication",
    defaultQuestions: 5,
    minQuestions: 3,
    maxQuestions: 10,
    requiresRole: true,
  },
  technical: {
    title: "Technical Interview",
    description: "Explain complex architectures, system design, and algorithms clearly",
    defaultQuestions: 5,
    minQuestions: 3,
    maxQuestions: 10,
    requiresRole: true,
  },
  viva: {
    title: "Academic Viva",
    description: "Defend research thesis, methodology, and core academic concepts",
    defaultQuestions: 5,
    minQuestions: 3,
    maxQuestions: 10,
    requiresSubject: true,
  },
  english: {
    title: "English Practice",
    description: "Enhance everyday conversational fluency, vocabulary, grammar, and pronunciation",
    defaultQuestions: 5,
    minQuestions: 3,
    maxQuestions: 10,
    requiresRole: false,
  },
} as const;

export function getDisplayMode(session: {
  mode?: string | null;
  job_role?: string | null;
  topic?: string | null;
  topic_focus?: string | null;
}): "english" | "hr" | "technical" | "viva" {
  if (session.mode === "english") return "english";
  const role = (session.job_role || "").toLowerCase();
  const topic = (session.topic || "").toLowerCase();
  const focus = (session.topic_focus || "").toLowerCase();
  if (
    role.includes("english") ||
    topic.includes("english") ||
    focus.includes("english")
  ) {
    return "english";
  }
  if (session.mode === "technical") return "technical";
  if (session.mode === "viva") return "viva";
  return "hr";
}

export function getModeTitle(mode: string): string {
  switch (mode) {
    case "english":
      return "English Practice";
    case "technical":
      return "Technical Interview";
    case "viva":
      return "Academic Viva";
    case "hr":
    default:
      return "HR Interview";
  }
}

export function getModeBadgeClass(mode: string): string {
  switch (mode) {
    case "english":
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800";
    case "technical":
      return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800";
    case "viva":
      return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800";
    case "hr":
    default:
      return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800";
  }
}

export const PROFICIENCY_LEVELS = [
  { value: "beginner", label: "Beginner", description: "New to English communication" },
  { value: "intermediate", label: "Intermediate", description: "Comfortable with basics" },
  { value: "advanced", label: "Advanced", description: "Confident speaker" },
] as const;

export const DIFFICULTY_LEVELS = [
  { value: "easy", label: "Easy", description: "Simple questions, basic concepts" },
  { value: "medium", label: "Medium", description: "Moderate complexity" },
  { value: "hard", label: "Hard", description: "Challenging, detailed responses" },
] as const;

export const EXPLANATION_LANGUAGES = [
  { value: "english", label: "English" },
  { value: "hindi", label: "Hindi (हिंदी)" },
  { value: "tamil", label: "Tamil (தமிழ்)" },
  { value: "telugu", label: "Telugu (తెలుగు)" },
  { value: "bengali", label: "Bengali (বাংলা)" },
  { value: "kannada", label: "Kannada (ಕನ್ನಡ)" },
] as const;

export const DEFAULT_CONFIG: Partial<PracticeSessionConfig> = {
  proficiencyLevel: "intermediate",
  difficulty: "medium",
  interactionMode: "voice",
  questionCount: 5,
  explanationLanguage: "english",
};
