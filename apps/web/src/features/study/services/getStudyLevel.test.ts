import { describe, expect, it } from "vitest";

import type { QuestionResult } from "@/features/questions/types/QuestionResult";
import { getHighestStudyLevel, getStudyLevel } from "./getStudyLevel";

describe("getStudyLevel", () => {
  it("starts every learner at the beginner level", () => {
    expect(
      getStudyLevel({
        questionsAnswered: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
      }),
    ).toMatchObject({ rank: 0, title: "Iniciante" });
  });

  it("recognizes a learner in development after ten answers", () => {
    expect(
      getStudyLevel({
        questionsAnswered: 14,
        correctAnswers: 11,
        wrongAnswers: 3,
      }),
    ).toMatchObject({ rank: 1, title: "Em desenvolvimento" });
  });

  it("requires volume and accuracy for the intermediate level", () => {
    expect(
      getStudyLevel({
        questionsAnswered: 30,
        correctAnswers: 21,
        wrongAnswers: 9,
      }),
    ).toMatchObject({ rank: 2, title: "Intermediário" });
    expect(
      getStudyLevel({
        questionsAnswered: 30,
        correctAnswers: 20,
        wrongAnswers: 10,
      }),
    ).toMatchObject({ rank: 1, title: "Em desenvolvimento" });
  });

  it("does not call practice professional before the highest criteria", () => {
    expect(
      getStudyLevel({
        questionsAnswered: 80,
        correctAnswers: 64,
        wrongAnswers: 16,
      }),
    ).toMatchObject({ rank: 3, title: "Avançado" });
    expect(
      getStudyLevel({
        questionsAnswered: 200,
        correctAnswers: 170,
        wrongAnswers: 30,
      }),
    ).toMatchObject({ rank: 4, title: "Prática profissional" });
  });

  it.each([
    [9, 9, 0],
    [10, 10, 1],
    [29, 29, 1],
    [30, 21, 2],
    [79, 79, 2],
    [80, 64, 3],
    [199, 199, 3],
    [200, 170, 4],
  ])(
    "aplica a fronteira de volume em %i respostas",
    (answered, correct, rank) => {
      expect(
        getStudyLevel({
          questionsAnswered: answered,
          correctAnswers: correct,
          wrongAnswers: answered - correct,
        }).rank,
      ).toBe(rank);
    },
  );

  it.each([
    [30, 20, 1],
    [30, 21, 2],
    [30, 22, 2],
    [80, 63, 2],
    [80, 64, 3],
    [80, 65, 3],
    [200, 169, 3],
    [200, 170, 4],
    [200, 171, 4],
  ])(
    "aplica o limiar de aproveitamento com %i respostas e %i acertos",
    (answered, correct, rank) => {
      expect(
        getStudyLevel({
          questionsAnswered: answered,
          correctAnswers: correct,
          wrongAnswers: answered - correct,
        }).rank,
      ).toBe(rank);
    },
  );

  it("fala de aproveitamento quando o volume do próximo nível já foi atingido", () => {
    expect(
      getStudyLevel({
        questionsAnswered: 30,
        correctAnswers: 20,
        wrongAnswers: 10,
      }).nextMilestone,
    ).toContain("70% de aproveitamento");
    expect(
      getStudyLevel({
        questionsAnswered: 30,
        correctAnswers: 20,
        wrongAnswers: 10,
      }).nextMilestone,
    ).not.toContain("30 questões");
  });

  it("preserva o maior nível alcançado e não repete o mesmo level-up", () => {
    const results: QuestionResult[] = Array.from(
      { length: 30 },
      (_, index) => ({
        questionId: index + 1,
        subject: "Português",
        correct: index < 21,
        answeredAt: `2026-09-04T10:${String(index).padStart(2, "0")}:00.000Z`,
      }),
    );
    const reached = getHighestStudyLevel(results);
    const afterErrors = getHighestStudyLevel([
      ...results,
      ...Array.from({ length: 10 }, (_, index) => ({
        questionId: 31 + index,
        subject: "Português",
        correct: false,
        answeredAt: `2026-09-04T11:${String(index).padStart(2, "0")}:00.000Z`,
      })),
    ]);

    expect(reached.rank).toBe(2);
    expect(afterErrors.rank).toBe(2);
    expect(afterErrors.rank > reached.rank).toBe(false);
  });
});
