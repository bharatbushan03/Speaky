import { sessionsAPI } from "./sessions";
import { SessionDetail } from "@/lib/types/session-api";

export function validateRoomSession(session: SessionDetail): SessionDetail {
  if (session.status === "completed" || session.status === "cancelled") return session;
  if (session.questions.length < 1 || session.questions.length > session.question_count) {
    throw new Error("The saved question state is invalid. Please reload the session.");
  }
  const questions = [...session.questions].sort((a, b) => a.order_index - b.order_index);
  if (questions.some((question, index) => question.order_index !== index) ||
      !Number.isInteger(session.current_question_index) ||
      session.current_question_index < 0 || session.current_question_index >= session.question_count ||
      session.current_question_index >= questions.length) {
    throw new Error("The saved question order or position is invalid. Please reload the session.");
  }
  return { ...session, questions };
}

export async function initializePracticeSession(id: string): Promise<SessionDetail> {
  let session = await sessionsAPI.getSession(id);
  // Terminal sessions are read-only, including when opened directly by URL.
  if (session.status === "completed" || session.status === "cancelled") return session;
  if (session.questions.length === 0) {
    session = await sessionsAPI.generateQuestion(id);
  }
  session = validateRoomSession(session);
  if (session.status === "created") {
    session = await sessionsAPI.startSession(id);
  }
  return validateRoomSession(session);
}
