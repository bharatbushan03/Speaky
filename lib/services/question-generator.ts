/**
 * Mock Question Generator
 * Generates practice questions based on session configuration
 * Will be replaced with AI-powered question generation API
 */

import { Question } from "../types/session";
import { QuestionGeneratorParams } from "../types/session";

const HR_QUESTIONS = {
  easy: [
    {
      text: "Tell me about yourself.",
      context: "This is a common opening question. Focus on your professional background and key achievements.",
      hints: ["Keep it concise (2-3 minutes)", "Focus on relevant experience", "End with why you're interested in this role"],
    },
    {
      text: "Why do you want to work for our company?",
      context: "Show that you've researched the company and understand its values.",
      hints: ["Mention specific company values or achievements", "Connect your goals with company mission", "Be genuine"],
    },
    {
      text: "What are your greatest strengths?",
      context: "Pick 2-3 strengths relevant to the role and provide examples.",
      hints: ["Be specific", "Use examples", "Relate to job requirements"],
    },
  ],
  medium: [
    {
      text: "Describe a time when you had to work with a difficult team member. How did you handle it?",
      context: "Use the STAR method: Situation, Task, Action, Result.",
      hints: ["Focus on your actions, not just the problem", "Show empathy and problem-solving", "Explain the positive outcome"],
    },
    {
      text: "Tell me about a time you failed. What did you learn from it?",
      context: "Show self-awareness and growth mindset.",
      hints: ["Be honest but professional", "Focus on what you learned", "Show how you improved"],
    },
    {
      text: "Where do you see yourself in 5 years?",
      context: "Show ambition but also commitment to the role.",
      hints: ["Be realistic", "Align with company growth", "Show long-term thinking"],
    },
  ],
  hard: [
    {
      text: "Describe a situation where you had to make an unpopular decision. How did you manage stakeholder expectations?",
      context: "This tests leadership, communication, and stakeholder management skills.",
      hints: ["Explain your decision-making process", "Show how you communicated", "Discuss long-term benefits"],
    },
    {
      text: "Tell me about a time you had to manage multiple competing priorities with tight deadlines.",
      context: "Demonstrate time management, prioritization, and stress management.",
      hints: ["Explain your prioritization framework", "Show delegation skills", "Discuss outcomes"],
    },
  ],
};

const TECHNICAL_QUESTIONS = {
  easy: [
    {
      text: "What programming languages are you most comfortable with and why?",
      context: "Discuss your technical background and preferences.",
      hints: ["Mention specific projects", "Explain your learning path", "Discuss strengths of each language"],
    },
    {
      text: "Explain the difference between a stack and a queue.",
      context: "Basic data structures question.",
      hints: ["Use simple analogies", "Mention use cases", "Draw if helpful"],
    },
  ],
  medium: [
    {
      text: "How would you design a URL shortening service like bit.ly?",
      context: "System design question testing scalability thinking.",
      hints: ["Start with requirements", "Discuss data model", "Address scalability"],
    },
    {
      text: "Explain how you would optimize a slow database query.",
      context: "Performance optimization and debugging skills.",
      hints: ["Discuss indexing", "Query analysis", "Caching strategies"],
    },
  ],
  hard: [
    {
      text: "Design a distributed cache system that can handle millions of requests per second.",
      context: "Advanced system design testing distributed systems knowledge.",
      hints: ["Discuss consistency models", "Sharding strategies", "Failure handling"],
    },
    {
      text: "How would you debug a memory leak in a production system without taking it offline?",
      context: "Production troubleshooting and debugging skills.",
      hints: ["Monitoring strategies", "Profiling tools", "Gradual rollout"],
    },
  ],
};

const VIVA_QUESTIONS = {
  easy: [
    {
      text: "What motivated you to choose this research topic?",
      context: "Explain your research interests and background.",
      hints: ["Personal interest", "Gap in literature", "Practical applications"],
    },
    {
      text: "What is the main objective of your research?",
      context: "Clearly state your research goals.",
      hints: ["Be specific", "Mention expected outcomes", "Explain significance"],
    },
  ],
  medium: [
    {
      text: "What is the theoretical framework guiding your research?",
      context: "Demonstrate understanding of relevant theories.",
      hints: ["Name key theories", "Explain relevance", "Justify selection"],
    },
    {
      text: "What are the limitations of your research methodology?",
      context: "Show critical thinking about your approach.",
      hints: ["Be honest", "Explain mitigation strategies", "Discuss trade-offs"],
    },
  ],
  hard: [
    {
      text: "How does your research contribute to the existing body of knowledge in your field?",
      context: "Demonstrate deep understanding of your field and research significance.",
      hints: ["Explain novelty", "Compare with existing work", "Discuss implications"],
    },
    {
      text: "If your hypothesis is proven wrong, what would be the implications for your field?",
      context: "Critical thinking about research outcomes and scientific process.",
      hints: ["Show understanding of scientific method", "Discuss alternative explanations", "Explain next steps"],
    },
  ],
};

export class QuestionGenerator {
  /**
   * Generate mock questions based on session parameters
   * In production, this would call an AI API
   */
  static generateQuestions(params: QuestionGeneratorParams): Question[] {
    const questions: Question[] = [];
    const questionPool = this.getQuestionPool(params.mode);
    const difficultyQuestions = questionPool[params.difficulty] || questionPool.medium;

    // Generate requested number of questions
    for (let i = 0; i < params.count; i++) {
      const index = i % difficultyQuestions.length;
      const baseQuestion = difficultyQuestions[index];

      questions.push({
        id: `q-${i + 1}`,
        text: this.customizeQuestion(baseQuestion.text, params),
        context: baseQuestion.context,
        hints: baseQuestion.hints,
      });
    }

    return questions;
  }

  /**
   * Get question pool based on practice mode
   */
  private static getQuestionPool(mode: QuestionGeneratorParams["mode"]) {
    switch (mode) {
      case "hr":
        return HR_QUESTIONS;
      case "technical":
        return TECHNICAL_QUESTIONS;
      case "viva":
        return VIVA_QUESTIONS;
      default:
        return HR_QUESTIONS;
    }
  }

  /**
   * Customize question text based on parameters
   */
  private static customizeQuestion(
    baseText: string,
    params: QuestionGeneratorParams
  ): string {
    let question = baseText;

    // Add job role or subject context where appropriate
    if (params.jobRole && params.mode !== "viva") {
      question = question.replace(
        /your (role|position|job)/gi,
        `your role as ${params.jobRole}`
      );
    }

    if (params.subject && params.mode === "viva") {
      question = question.replace(
        /your (research|field|study)/gi,
        `your ${params.subject} research`
      );
    }

    // Add topic focus if specified
    if (params.topicFocus) {
      question += ` (Focus: ${params.topicFocus})`;
    }

    return question;
  }

  /**
   * Validate if sufficient questions can be generated
   */
  static canGenerateQuestions(params: QuestionGeneratorParams): boolean {
    return params.count > 0 && params.count <= 20;
  }
}
