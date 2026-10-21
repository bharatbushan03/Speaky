import { PracticeSessionConfig } from "./practice";

export interface SessionConfigRequest {
  mode: PracticeSessionConfig["mode"];
  job_role?: string | null;
  subject?: string | null;
  proficiency_level: PracticeSessionConfig["proficiencyLevel"];
  difficulty: PracticeSessionConfig["difficulty"];
  interaction_mode: PracticeSessionConfig["interactionMode"];
  question_count: number;
  explanation_language: PracticeSessionConfig["explanationLanguage"];
  topic_focus?: string | null;
}

export interface SessionQuestion {
  id: string;
  session_id: string;
  text: string;
  context: string | null;
  hints: string[] | null;
  order_index: number;
  created_at: string;
}

export interface SessionResponse {
  id: string;
  session_id: string;
  question_id: string;
  answer_text: string;
  interaction_mode: PracticeSessionConfig["interactionMode"];
  transcript_edited: boolean;
  audio_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionDetail extends SessionConfigRequest {
  id: string;
  user_id: string;
  status: "created" | "in_progress" | "completed" | "cancelled";
  current_question_index: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  questions: SessionQuestion[];
  responses: SessionResponse[];
}

export type EvaluationDimension =
  | "grammar"
  | "vocabulary"
  | "clarity"
  | "coherence"
  | "relevance"
  | "interview_technique"
  | "technical_correctness"
  | "spoken_fluency";

export interface DimensionScore {
  score: number | null;
  available: boolean;
  explanation: string;
  unavailable_reason?: string | null;
}

export interface AnswerCorrection {
  category: EvaluationDimension;
  original: string;
  corrected: string;
  explanation: string;
}

export interface AnswerEvaluation {
  response_id: string;
  question_id: string;
  corrected_answer: string;
  corrections: AnswerCorrection[];
  explanations: string[];
  strengths: string[];
  improvements: string[];
  retry_recommendations: string[];
}

export interface SessionEvaluation {
  id: string;
  session_id: string;
  overall_score: number | null;
  dimensions: Partial<Record<EvaluationDimension, DimensionScore>>;
  summary: string;
  explanations: string[];
  strengths: string[];
  improvements: string[];
  retry_recommendations: string[];
  answer_evaluations: AnswerEvaluation[];
  explanation_language: PracticeSessionConfig["explanationLanguage"];
  created_at: string;
  updated_at: string;
}

export interface SessionUpdateRequest {
  status?: "in_progress" | "cancelled";
  current_question_index?: number;
  topic_focus?: string;
}

export type SessionQuestionRequest = Pick<SessionQuestion, "text" | "order_index"> & {
  context?: string;
  hints?: string[];
};

export type SubmitResponseRequest = Pick<
  SessionResponse, "question_id" | "answer_text" | "interaction_mode" | "transcript_edited"
>;

export function toSessionRequest(config: PracticeSessionConfig): SessionConfigRequest {
  return {
    mode: config.mode,
    ...(config.mode === "viva"
      ? { subject: config.subject?.trim() }
      : { job_role: config.jobRole?.trim() }),
    proficiency_level: config.proficiencyLevel,
    difficulty: config.difficulty,
    interaction_mode: config.interactionMode,
    question_count: config.questionCount,
    explanation_language: config.explanationLanguage,
    topic_focus: config.topicFocus?.trim() || undefined,
  };
}

export function toPracticeConfig(session: SessionDetail): PracticeSessionConfig {
  return {
    mode: session.mode,
    jobRole: session.job_role ?? undefined,
    subject: session.subject ?? undefined,
    proficiencyLevel: session.proficiency_level,
    difficulty: session.difficulty,
    interactionMode: session.interaction_mode,
    questionCount: session.question_count,
    explanationLanguage: session.explanation_language,
    topicFocus: session.topic_focus ?? undefined,
  };
}
