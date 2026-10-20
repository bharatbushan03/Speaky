/**
 * Practice Session State Types
 * Type definitions for active practice sessions
 */

import { PracticeSessionConfig } from "./practice";

export interface Question {
  id: string;
  text: string;
  context?: string; // Additional context or follow-up information
  hints?: string[]; // Optional hints for the user
}

export interface Answer {
  questionId: string;
  text: string;
  timestamp: Date;
  interactionMode: "text" | "voice";
  transcriptEdited?: boolean; // For voice mode, if transcript was edited
  audioData?: string; // Base64 encoded audio (future use)
}

export type SessionStatus = "not_started" | "in_progress" | "completed" | "cancelled";

export type RecordingState = "idle" | "requesting_permission" | "permission_denied" | "recording" | "processing" | "error";

export interface SessionState {
  config: PracticeSessionConfig;
  questions: Question[];
  answers: Answer[];
  currentQuestionIndex: number;
  status: SessionStatus;
  startTime: Date | null;
  endTime: Date | null;
}

export interface SpeechRecognitionError {
  type: "permission_denied" | "not_supported" | "network_error" | "no_speech" | "unknown";
  message: string;
}

export interface RecordingSession {
  state: RecordingState;
  transcript: string;
  error: SpeechRecognitionError | null;
  isEditing: boolean;
}

// Mock question generators based on mode and difficulty
export interface QuestionGeneratorParams {
  mode: PracticeSessionConfig["mode"];
  difficulty: PracticeSessionConfig["difficulty"];
  count: number;
  jobRole?: string;
  subject?: string;
  topicFocus?: string;
}
