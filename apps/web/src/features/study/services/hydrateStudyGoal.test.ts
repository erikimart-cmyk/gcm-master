import { describe, expect, it } from "vitest";

import { hydrateStudyGoal } from "./hydrateStudyGoal";

describe("hydrateStudyGoal", () => {
  it("restores a catalog goal from its persisted ID", () => {
    expect(hydrateStudyGoal("tecnologia")).toMatchObject({
      id: "tecnologia",
      title: "Tecnologia",
    });
  });

  it("does not hydrate an unknown or missing goal", () => {
    expect(hydrateStudyGoal(null)).toBeNull();
    expect(hydrateStudyGoal("unknown-goal")).toBeNull();
  });
});
