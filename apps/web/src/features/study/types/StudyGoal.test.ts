import { describe, expect, it } from "vitest";

import { studyGoals } from "./StudyGoal";

describe("studyGoals", () => {
  it("define os seis objetivos com IDs únicos", () => {
    expect(studyGoals.map(({ id }) => id)).toEqual([
      "concursos",
      "idiomas",
      "tecnologia",
      "novas-habilidades",
      "carreira",
      "explorar",
    ]);

    expect(new Set(studyGoals.map(({ id }) => id)).size).toBe(
      studyGoals.length,
    );
  });
});
