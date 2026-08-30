import { describe, expect, it } from "vitest";

import { selectReviewQuestions } from "./ReviewQuestionSelector";

import type { Question } from "@/features/questions/types/Question";
import type { QuestionResult } from "@/features/questions/types/QuestionResult";

describe("ReviewQuestionSelector", () => {
  const questions: Question[] = [
    {
      id: 1,
      country: "BR",
      language: "pt-BR",
      bankId: "VUNESP",
      exam: "GCM",
      position: "Guarda Civil Municipal",
      year: 2026,
      subject: "Português",
      topic: "Interpretação de texto",
      difficulty: "easy",
      statement: "Questão 1",
      alternatives: [
        { id: "A", text: "Alternativa A" },
        { id: "B", text: "Alternativa B" },
      ],
      correctAnswer: "A",
      explanation: "Explicação",
      tags: [],
    },
    {
      id: 2,
      country: "BR",
      language: "pt-BR",
      bankId: "VUNESP",
      exam: "GCM",
      position: "Guarda Civil Municipal",
      year: 2026,
      subject: "Matemática",
      topic: "Porcentagem",
      difficulty: "medium",
      statement: "Questão 2",
      alternatives: [
        { id: "A", text: "Alternativa A" },
        { id: "B", text: "Alternativa B" },
      ],
      correctAnswer: "B",
      explanation: "Explicação",
      tags: [],
    },
    {
      id: 3,
      country: "BR",
      language: "pt-BR",
      bankId: "VUNESP",
      exam: "GCM",
      position: "Guarda Civil Municipal",
      year: 2026,
      subject: "Direito Constitucional",
      topic: "Direitos fundamentais",
      difficulty: "medium",
      statement: "Questão 3",
      alternatives: [
        { id: "A", text: "Alternativa A" },
        { id: "B", text: "Alternativa B" },
      ],
      correctAnswer: "A",
      explanation: "Explicação",
      tags: [],
    },
  ];

  it("deve retornar somente as questões erradas", () => {
    const results: QuestionResult[] = [
      {
        questionId: 1,
        subject: "Português",
        correct: true,
        answeredAt: new Date().toISOString(),
      },
      {
        questionId: 2,
        subject: "Matemática",
        correct: false,
        answeredAt: new Date().toISOString(),
      },
      {
        questionId: 3,
        subject: "Direito Constitucional",
        correct: false,
        answeredAt: new Date().toISOString(),
      },
    ];

    const result = selectReviewQuestions(
      questions,
      results,
    );

    expect(result.map((question) => question.id)).toEqual([
      2,
      3,
    ]);
  });

  it("deve retornar nenhuma questão quando não houver erros", () => {
    const results: QuestionResult[] = [
      {
        questionId: 1,
        subject: "Português",
        correct: true,
        answeredAt: new Date().toISOString(),
      },
      {
        questionId: 2,
        subject: "Matemática",
        correct: true,
        answeredAt: new Date().toISOString(),
      },
      {
        questionId: 3,
        subject: "Direito Constitucional",
        correct: true,
        answeredAt: new Date().toISOString(),
      },
    ];

    const result = selectReviewQuestions(
      questions,
      results,
    );

    expect(result).toEqual([]);
  });

  it("deve preservar a ordem original das questões", () => {
    const results: QuestionResult[] = [
      {
        questionId: 3,
        subject: "Direito Constitucional",
        correct: false,
        answeredAt: new Date().toISOString(),
      },
      {
        questionId: 1,
        subject: "Português",
        correct: false,
        answeredAt: new Date().toISOString(),
      },
    ];

    const result = selectReviewQuestions(
      questions,
      results,
    );

    expect(result.map((question) => question.id)).toEqual([
      1,
      3,
    ]);
  });

  it("deve retornar uma lista vazia quando não houver resultados", () => {
    const result = selectReviewQuestions(
      questions,
      [],
    );

    expect(result).toEqual([]);
  });

  it("deve considerar somente a última tentativa de cada questão", () => {
    const results: QuestionResult[] = [
      {
        questionId: 1,
        subject: "Português",
        correct: false,
        answeredAt: "2026-08-27T10:00:00.000Z",
        attempt: 1,
      },
      {
        questionId: 1,
        subject: "Português",
        correct: true,
        answeredAt: "2026-08-27T10:05:00.000Z",
        attempt: 2,
        isReview: true,
      },
    ];

    const result = selectReviewQuestions(
      questions,
      results,
    );

    expect(result).toEqual([]);
  });

  it("deve manter a questão na revisão quando a última tentativa for errada", () => {
    const results: QuestionResult[] = [
      {
        questionId: 1,
        subject: "Português",
        correct: true,
        answeredAt: "2026-08-27T10:00:00.000Z",
        attempt: 1,
      },
      {
        questionId: 1,
        subject: "Português",
        correct: false,
        answeredAt: "2026-08-27T10:05:00.000Z",
        attempt: 2,
        isReview: true,
      },
    ];

    const result = selectReviewQuestions(
      questions,
      results,
    );

    expect(result.map((question) => question.id)).toEqual([
      1,
    ]);
  });
});