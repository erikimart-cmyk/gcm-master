import { describe, expect, it } from "vitest";

import { getDashboardState } from "./getDashboardState";

describe("getDashboardState", () => {
  it("representa primeiro acesso sem percentual", () => {
    const result = getDashboardState(
      { questionsAnswered: 0, correctAnswers: 0, wrongAnswers: 0 },
      false,
    );

    expect(result.accuracy).toBeNull();
    expect(result.attentionState).toBe("initial");
    expect(result.nextStep.state).toBe("initial");
    expect(result.nextStep.actionPath).toBe("/revisao/questoes");
  });

  it("calcula o aproveitamento real e mantém o estudo sem prioridades", () => {
    const result = getDashboardState(
      { questionsAnswered: 3, correctAnswers: 2, wrongAnswers: 1 },
      false,
    );

    expect(result.accuracy).toBe(67);
    expect(result.attentionState).toBe("up-to-date");
    expect(result.nextStep.state).toBe("up-to-date");
    expect(result.nextStep.actionPath).toBe("/revisao/questoes");
  });

  it("recomenda revisão quando há prioridades", () => {
    const result = getDashboardState(
      { questionsAnswered: 4, correctAnswers: 1, wrongAnswers: 3 },
      true,
    );

    expect(result.accuracy).toBe(25);
    expect(result.attentionState).toBe("priority");
    expect(result.nextStep.state).toBe("review");
    expect(result.nextStep.actionPath).toBe("/revisao");
  });
});
