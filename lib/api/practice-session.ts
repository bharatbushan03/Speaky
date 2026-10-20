import { sessionsAPI } from "./sessions";
import { QuestionGenerator } from "@/lib/services/question-generator";
import { SessionDetail, toPracticeConfig } from "@/lib/types/session-api";

export function validateRoomSession(session: SessionDetail): SessionDetail {
  if (session.status === "completed" || session.status === "cancelled") return session;
  if (session.questions.length !== session.question_count) {
    throw new Error("The saved question set is incomplete. Please reload the session.");
  }
  const questions = [...session.questions].sort((a, b) => a.order_index - b.order_index);
  if (questions.some((question, index) => question.order_index !== index) ||
      !Number.isInteger(session.current_question_index) ||
      session.current_question_index < 0 || session.current_question_index >= questions.length) {
    throw new Error("The saved question order or position is invalid. Please reload the session.");
  }
  return { ...session, questions };
}

export async function initializePracticeSession(id: string): Promise<SessionDetail> {
  let session = await sessionsAPI.getSession(id);
  // Terminal sessions are read-only, including when opened directly by URL.
  if (session.status === "completed" || session.status === "cancelled") return session;
  if (session.status === "created" && session.questions.length === 0) {
    const config = toPracticeConfig(session);
    const questions = QuestionGenerator.generateQuestions({
      ...config, count: config.questionCount,
    });
    session = await sessionsAPI.setQuestions(id, questions.map((question, order_index) => ({
      text: question.text,
      context: question.context,
      hints: question.hints,
      order_index,
    })));
    // Local q-1 style IDs are deliberately discarded. All subsequent writes
    // use the database-generated question UUIDs returned by the backend.
  }
  session = validateRoomSession(session);
  if (session.status === "created") {
    session = await sessionsAPI.updateSession(id, { status: "in_progress" });
  }
  return validateRoomSession(session);
}
