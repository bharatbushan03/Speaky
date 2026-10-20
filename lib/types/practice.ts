/**
 * Practice Session Types
 * Type definitions for practice session configuration
 */

export type PracticeMode = "hr" | "technical" | "viva";

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
    description: "Master behavioral questions and professional communication",
    defaultQuestions: 5,
    minQuestions: 3,
    maxQuestions: 10,
    requiresRole: true,
  },
  technical: {
    title: "Technical Interview",
    description: "Explain complex concepts and handle technical discussions",
    defaultQuestions: 5,
    minQuestions: 3,
    maxQuestions: 10,
    requiresRole: true,
  },
  viva: {
    title: "Academic Viva",
    description: "Defend research and answer academic questions",
    defaultQuestions: 5,
    minQuestions: 3,
    maxQuestions: 10,
    requiresSubject: true,
  },
} as const;

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
  interactionMode: "text",
  questionCount: 5,
  explanationLanguage: "english",
};
