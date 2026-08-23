import { describe, expect, it } from "vitest";

import { questions } from "@/features/landing/data/questions";
import { selectQuestions } from "./QuestionSelector";
import { examBanks } from "@/features/questions/data/banks";

describe("QuestionSelector", () => {
  it("todas as questões devem possuir uma banca cadastrada", () => {
  for (const question of questions) {
    const bankExists = examBanks.some(
      (bank) => bank.id === question.bankId,
    );

    expect(bankExists).toBe(true);
  }
});
  it("deve retornar todas as questões da vunesp", () => {
    const result = selectQuestions(questions, {
      bankId: "vunesp",
    });

    expect(result).toHaveLength(5);
  });

  it("deve filtrar questões por disciplina", () => {
    const result = selectQuestions(questions, {
      bankId: "vunesp",
      subject: "Direito Constitucional",
    });

    expect(result).toHaveLength(2);
  });

  it("deve filtrar questões por dificuldade", () => {
    const result = selectQuestions(questions, {
      difficulty: "medium",
    });

    expect(result).toHaveLength(3);
  });

  it("deve retornar nenhuma questão quando não houver correspondência", () => {
    const result = selectQuestions(questions, {
      subject: "Direito Penal",
    });

    expect(result).toHaveLength(0);
  });
});