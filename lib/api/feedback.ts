import { post } from "@/lib/api-client";
import { FeedbackItem, SessionType } from "./sessions";

export interface FeedbackRequest {
  text: string;
  session_type: SessionType;
  question?: string;
}

export interface FeedbackResponse {
  overall_score: number;
  feedback_items: FeedbackItem[];
  summary: string;
}

export interface TranscriptionRequest {
  audio_data: string; // Base64 encoded audio
  language?: string; // Default: en-IN
}

export interface TranscriptionResponse {
  text: string;
  confidence: number | null;
  language_detected: string | null;
  provider: string;
  model: string | null;
  truncated?: boolean;
}

export interface SpeechMeta {
  transcription_provider: "gnani" | "openai" | "browser" | "typed";
  transcription_model?: string | null;
  detected_language?: string | null;
  audio_duration_ms?: number | null;
}

export const feedbackAPI = {
  /**
   * Analyze text and get AI feedback
   */
  analyzeText: async (data: FeedbackRequest): Promise<FeedbackResponse> => {
    return post<FeedbackResponse>("/api/v1/feedback/analyze", data);
  },

  /**
   * Transcribe audio to text
   */
  transcribeAudio: async (
    data: TranscriptionRequest
  ): Promise<TranscriptionResponse> => {
    return post<TranscriptionResponse>("/api/v1/feedback/transcribe", data);
  },
};
