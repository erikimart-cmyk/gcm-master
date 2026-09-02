import { describe, expect, it } from "vitest";

import { prioritizeSubjects } from "./SubjectPriorityEngine";
import type { SubjectPerformance } from "@/features/study/types/SubjectPerformance";

describe("SubjectPriorityEngine", () => {
  it("deve colocar disciplinas de prioridade alta antes das demais", () => {
    const performances: SubjectPerformance[] = [
      {
        subject: "Matemática",
        questionsAnswered: 20,
        correctAnswers: 18,
        wrongAnswers: 2,
        accuracy: 90,
        priority: "low",
      },
      {
        subject: "Português",
        questionsAnswered: 20,
        correctAnswers: 14,
        wrongAnswers: 6,
        accuracy: 70,
        priority: "medium",
      },
      {
        subject: "Direito Constitucional",
        questionsAnswered: 20,
        correctAnswers: 10,
        wrongAnswers: 10,
        accuracy: 50,
        priority: "high",
      },
    ];

    const result = prioritizeSubjects(performances);

    expect(result.map((item) => item.subject)).toEqual([
      "Direito Constitucional",
      "Português",
      "Matemática",
    ]);
  });

  it("deve priorizar a menor taxa de acerto quando as prioridades forem iguais", () => {
    const performances: SubjectPerformance[] = [
      {
        subject: "Português",
        questionsAnswered: 20,
        correctAnswers: 12,
        wrongAnswers: 8,
        accuracy: 60,
        priority: "medium",
      },
      {
        subject: "Matemática",
        questionsAnswered: 20,
        correctAnswers: 10,
        wrongAnswers: 10,
        accuracy: 50,
        priority: "medium",
      },
      {
        subject: "História",
        questionsAnswered: 20,
        correctAnswers: 14,
        wrongAnswers: 6,
        accuracy: 70,
        priority: "medium",
      },
    ];

    const result = prioritizeSubjects(performances);

    expect(result.map((item) => item.subject)).toEqual([
      "Matemática",
      "Português",
      "História",
    ]);
  });

  it("não deve alterar o array original", () => {
    const performances: SubjectPerformance[] = [
      {
        subject: "Matemática",
        questionsAnswered: 10,
        correctAnswers: 9,
        wrongAnswers: 1,
        accuracy: 90,
        priority: "low",
      },
      {
        subject: "Português",
        questionsAnswered: 10,
        correctAnswers: 5,
        wrongAnswers: 5,
        accuracy: 50,
        priority: "high",
      },
    ];

    const originalOrder = performances.map((item) => item.subject);

    prioritizeSubjects(performances);

    expect(performances.map((item) => item.subject)).toEqual(originalOrder);
  });

  it("deve retornar uma lista vazia quando não houver disciplinas", () => {
    const result = prioritizeSubjects([]);

    expect(result).toEqual([]);
  });
  it("não deve priorizar disciplinas sem erros pendentes", () => {
    const performances: SubjectPerformance[] = [
      {
        subject: "Direito Constitucional",
        questionsAnswered: 2,
        correctAnswers: 2,
        wrongAnswers: 0,
        accuracy: 100,
        priority: "low",
      },
      {
        subject: "Português",
        questionsAnswered: 2,
        correctAnswers: 1,
        wrongAnswers: 1,
        accuracy: 50,
        priority: "high",
      },
    ];

    const result = prioritizeSubjects(performances);

    expect(result.map((item) => item.subject)).toEqual(["Português"]);
  });
});
