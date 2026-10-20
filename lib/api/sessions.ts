import { get, post, put, patch } from "@/lib/api-client";
import {
  SessionConfigRequest,
  SessionDetail,
  SessionQuestionRequest,
  SessionUpdateRequest,
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
};
