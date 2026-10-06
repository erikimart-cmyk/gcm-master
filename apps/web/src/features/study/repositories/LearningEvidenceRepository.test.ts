import { beforeEach, describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({
  getClient: vi.fn(),
}));

vi.mock("@/features/auth/lib/supabase", () => ({
  getSupabaseClient: supabase.getClient,
}));

import repositorySource from "./LearningEvidenceRepository.ts?raw";
import { loadLearningEvidence } from "./LearningEvidenceRepository";

type QueryCall = {
  method: string;
  args: unknown[];
};

function installEvidence(nameShape: "object" | "array") {
  const calls: QueryCall[] = [];
  const knowledgeUnits =
    nameShape === "array"
      ? [{ name: "Variação percentual" }]
      : { name: "Variação percentual" };

  const builder = {
    select(columns: string) {
      calls.push({ method: "select", args: [columns] });
      return builder;
    },
    eq(column: string, value: string) {
      calls.push({ method: "eq", args: [column, value] });
      return builder;
    },
    order(column: string, options: { ascending: boolean }) {
      calls.push({ method: "order", args: [column, options] });
      return builder;
    },
    insert() {
      throw new Error("insert is not allowed");
    },
    update() {
      throw new Error("update is not allowed");
    },
    upsert() {
      throw new Error("upsert is not allowed");
    },
    delete() {
      throw new Error("delete is not allowed");
    },
    then(
      onFulfilled: (value: { data: unknown[]; error: null }) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) {
      const profileId = calls.find((call) => call.method === "eq" && call.args[0] === "profile_id")
        ?.args[1];
      const rows =
        profileId === "smoke-profile"
          ? [
              {
                id: "evidence-1005",
                knowledge_unit_id: "percentage-change",
                observation: "difficulty",
                stage: "comprehension",
                strength: "weak",
                assistance_context: "unknown",
                timing_interpretation: "unknown",
                producer_type: "deterministic_rule",
                producer_version: "m2c-v1",
                observed_at: "2026-10-02T23:03:09.839649+00:00",
                generated_at: "2026-10-02T23:03:09.839649+00:00",
                knowledge_units: knowledgeUnits,
              },
            ]
          : [];

      return Promise.resolve({ data: rows, error: null }).then(onFulfilled, onRejected);
    },
  };

  supabase.getClient.mockReturnValue({
    from: (table: string) => {
      calls.push({ method: "from", args: [table] });
      return builder;
    },
    rpc() {
      throw new Error("rpc is not allowed");
    },
  });

  return calls;
}

describe("loadLearningEvidence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads only the signed-in profile and does not classify", async () => {
    const calls = installEvidence("object");

    await expect(loadLearningEvidence("smoke-profile")).resolves.toEqual([
      {
        evidenceId: "evidence-1005",
        knowledgeUnitId: "percentage-change",
        knowledgeUnitName: "Variação percentual",
        observation: "difficulty",
        stage: "comprehension",
        strength: "weak",
        assistanceContext: "unknown",
        timingInterpretation: "unknown",
        producerType: "deterministic_rule",
        producerVersion: "m2c-v1",
        observedAt: "2026-10-02T23:03:09.839649+00:00",
        generatedAt: "2026-10-02T23:03:09.839649+00:00",
      },
    ]);

    expect(calls).toEqual([
      { method: "from", args: ["learning_evidence"] },
      {
        method: "select",
        args: [
          "id, knowledge_unit_id, observation, stage, strength, assistance_context, timing_interpretation, producer_type, producer_version, observed_at, generated_at, knowledge_units(name)",
        ],
      },
      { method: "eq", args: ["profile_id", "smoke-profile"] },
      { method: "order", args: ["observed_at", { ascending: true }] },
      { method: "order", args: ["generated_at", { ascending: true }] },
      { method: "order", args: ["id", { ascending: true }] },
    ]);
    expect(repositorySource).not.toMatch(/\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/);
    expect(repositorySource).not.toMatch(/mastery|mastered|proficiency|confidence|priority/i);
    expect(repositorySource).toContain("evidence_actions");
  });

  it("reads an embedded knowledge unit name delivered as an array", async () => {
    installEvidence("array");

    const [loaded] = await loadLearningEvidence("smoke-profile");
    expect(loaded.knowledgeUnitName).toBe("Variação percentual");
  });

  it("does not return another profile's evidence", async () => {
    installEvidence("object");

    await expect(loadLearningEvidence("other-profile")).resolves.toEqual([]);
  });
});
