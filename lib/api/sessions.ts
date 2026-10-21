import { get, post, put, patch } from "@/lib/api-client";
import {
  SessionConfigRequest,
  SessionDetail,
  SessionQuestionRequest,
  SessionUpdateRequest,
  SessionEvaluation,
  SubmitResponseRequest,
} from "@/lib/types/session-api";

export enum SessionType {
  INTERVIEW = "interview",
  VIVA = "viva",
  FREE_CONVERSATION = "free_conversation",
  GRAMMAR = "grammar",
}

export enum FeedbackCategory {
  GRAMMAR = "grammar",
  FLUENCY = "fluency",
  VOCABULARY = "vocabulary",
  PRONUNCIATION = "pronunciation",
  CONTENT = "content",
}

export interface FeedbackItem {
  category: FeedbackCategory;
  score: number;
  comments: string;
  suggestions: string[];
}

export interface ProgressSummary {
  total_sessions: number;
  total_questions: number;
  average_score: number | null;
  grammar_score: number | null;
  vocabulary_score: number | null;
  fluency_score: number | null;
  pronunciation_score: number | null;
  current_streak: number;
  longest_streak: number;
  last_practice_date: string | null;
  sessions_by_mode: Record<string, number>;
}

export interface SessionHistoryItem {
  session_id: string;
  mode: string;
  topic: string | null;
  status: string;
  question_count: number;
  started_at: string | null;
  completed_at: string | null;
  overall_score: number | null;
  date: string;
}

export interface SessionHistoryFilters {
  mode: string | null;
  topic: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  limit: number;
  offset: number;
}

export interface TrendPoint {
  date: string;
  score: number | null;
  grammar: number | null;
  vocabulary: number | null;
  fluency: number | null;
}

export interface RecommendationItem {
  id: string;
  type: string;
  title: string;
  reason: string;
  action_href: string | null;
}

export const sessionsAPI = {
  createSession: (data: SessionConfigRequest): Promise<SessionDetail> =>
    post<SessionDetail>("/api/v1/sessions/", data),
  getSession: (id: string): Promise<SessionDetail> =>
    get<SessionDetail>(`/api/v1/sessions/${encodeURIComponent(id)}`),
  setQuestions: (id: string, questions: SessionQuestionRequest[]): Promise<SessionDetail> =>
    put<SessionDetail>(`/api/v1/sessions/${encodeURIComponent(id)}/questions`, { questions }),
  generateQuestion: (id: string): Promise<SessionDetail> =>
    post<SessionDetail>(`/api/v1/sessions/${encodeURIComponent(id)}/questions/generate`),
  startSession: (id: string): Promise<SessionDetail> =>
    post<SessionDetail>(`/api/v1/sessions/${encodeURIComponent(id)}/start`),
  updateSession: (id: string, data: SessionUpdateRequest): Promise<SessionDetail> =>
    patch<SessionDetail>(`/api/v1/sessions/${encodeURIComponent(id)}`, data),
  submitResponse: (id: string, data: SubmitResponseRequest): Promise<SessionDetail> =>
    post<SessionDetail>(`/api/v1/sessions/${encodeURIComponent(id)}/responses`, data),
  completeSession: (id: string): Promise<SessionDetail> =>
    post<SessionDetail>(`/api/v1/sessions/${encodeURIComponent(id)}/complete`),
  getEvaluation: (id: string): Promise<SessionEvaluation> =>
    get<SessionEvaluation>(`/api/v1/sessions/${encodeURIComponent(id)}/evaluation`),
  evaluateSession: (id: string): Promise<SessionEvaluation> =>
    post<SessionEvaluation>(`/api/v1/sessions/${encodeURIComponent(id)}/evaluate`),
  postTTS: (data: { question_text: string; language: string }) =>
    post<TTSResponse>("/api/v1/feedback/tts", data),
  getProgressSummary: (): Promise<ProgressSummary> =>
    get<ProgressSummary>("/api/v1/progress/summary"),
  getSessionHistory: (filters: SessionHistoryFilters) =>
    get<List<SessionHistoryItem>>("/api/v1/progress/history", { params: filters }),
  getPerformanceTrends: (): Promise<List<TrendPoint>> =>
    get<List<TrendPoint>>("/api/v1/progress/trends"),
  getPersonalizedRecommendations: (): Promise<List<RecommendationItem>> =>
    get<List<RecommendationItem>>("/api/v1/progress/recommendations"),
};
