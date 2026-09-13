import { describe, expect, it } from "vitest";

import { getDashboardEngagementState } from "./getDashboardEngagementState";

describe("getDashboardEngagementState", () => {
  it("orienta o primeiro estudo sem criar um histórico fictício", () => {
    const result = getDashboardEngagementState({
      questionsAnswered: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
    });

    expect(result.mission).toMatchObject({
      state: "first-step",
      actionPath: "/revisao/questoes",
    });
    expect(result.narrative.tone).toBe("initial");
  });

  it("direciona a revisão quando existe uma disciplina priorizada", () => {
    const result = getDashboardEngagementState(
      { questionsAnswered: 8, correctAnswers: 5, wrongAnswers: 3 },
      "Direito Constitucional",
      1,
    );

    expect(result.mission).toMatchObject({
      state: "review",
      title: "Reforce Direito Constitucional",
      actionPath: "/revisao",
    });
    expect(result.narrative).toMatchObject({
      tone: "attention",
      title: "Você acertou 5 de 8 questões",
    });
    expect(result.narrative.description).toContain(
      "Há 1 resposta para revisar",
    );
    expect(result.narrative.description).not.toContain("Há 3 respostas");
  });

  it("incentiva nova prática para quem está em dia", () => {
    const result = getDashboardEngagementState({
      questionsAnswered: 1,
      correctAnswers: 1,
      wrongAnswers: 0,
    });

    expect(result.mission).toMatchObject({
      state: "practice",
      actionPath: "/revisao/questoes",
    });
    expect(result.mission.description).toContain("1 questão");
    expect(result.narrative.tone).toBe("positive");
  });
});
