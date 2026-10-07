import { beforeEach, describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({
  getClient: vi.fn(),
}));

vi.mock("@/features/auth/lib/supabase", () => ({
  getSupabaseClient: supabase.getClient,
}));

import repositorySource from "./EffectiveEvidenceRepository.ts?raw";
import {
  parseEffectiveEvidenceWire,
  readEffectiveLearningEvidence,
} from "./EffectiveEvidenceRepository";

const evidenceRow = {
  evidence_id: "evidence-1003",
  learning_event_id: "event-1003",
  question_id: 1003,
  question_version_id: "version-1003",
  attempt_id: "attempt-1003",
  knowledge_unit_id: "percentage-increase-decrease",
  knowledge_unit_name: "Aumento e desconto percentual",
  stage: "comprehension",
  observation: "success",
  observed_at: "2026-10-02T12:00:00+00:00",
  generated_at: "2026-10-02T12:00:01+00:00",
  strength: "weak",
  assistance_context: "unknown",
  timing_interpretation: "unknown",
  producer_type: "deterministic_rule",
  producer_version: "m2c-v1",
};

function envelope(overrides: Record<string, unknown> = {}) {
  return {
    resolver_version: "effective-evidence-v1",
    actions_applied: true,
    integrity_status: "ok",
    unresolved_evidence_ids: [],
    components: [],
    evidence: [evidenceRow],
    ...overrides,
  };
}

describe("parseEffectiveEvidenceWire", () => {
  it("parses an ok reading and preserves provenance", () => {
    expect(parseEffectiveEvidenceWire(envelope())).toEqual({
      resolverVersion: "effective-evidence-v1",
      actionsApplied: true,
      integrityStatus: "ok",
      unresolvedEvidenceIds: [],
      components: [],
      evidence: [
        {
          evidenceId: "evidence-1003",
          learningEventId: "event-1003",
          questionId: 1003,
          questionVersionId: "version-1003",
          attemptId: "attempt-1003",
          knowledgeUnitId: "percentage-increase-decrease",
          knowledgeUnitName: "Aumento e desconto percentual",
          stage: "comprehension",
          observation: "success",
          observedAt: "2026-10-02T12:00:00+00:00",
          generatedAt: "2026-10-02T12:00:01+00:00",
          strength: "weak",
          assistanceContext: "unknown",
          timingInterpretation: "unknown",
          producerType: "deterministic_rule",
          producerVersion: "m2c-v1",
        },
      ],
    });
  });

  it("accepts an empty ok reading", () => {
    const reading = parseEffectiveEvidenceWire(
      envelope({ evidence: [], integrity_status: "ok" }),
    );

    expect(reading.integrityStatus).toBe("ok");
    expect(reading.evidence).toEqual([]);
    expect(reading.actionsApplied).toBe(true);
    expect(reading.resolverVersion).toBe("effective-evidence-v1");
  });

  it("accepts an empty degraded reading", () => {
    const reading = parseEffectiveEvidenceWire(
      envelope({
        evidence: [],
        integrity_status: "degraded",
        unresolved_evidence_ids: ["evidence-1002"],
        components: [
          {
            evidence_ids: ["evidence-1002"],
            status: "PROVENANCE_MISSING",
          },
        ],
      }),
    );

    expect(reading.integrityStatus).toBe("degraded");
    expect(reading.evidence).toEqual([]);
    expect(reading.unresolvedEvidenceIds).toEqual(["evidence-1002"]);
    expect(reading.components).toEqual([
      { evidenceIds: ["evidence-1002"], status: "PROVENANCE_MISSING" },
    ]);
  });

  it("rejects a degraded payload that looks like an empty success", () => {
    expect(() =>
      parseEffectiveEvidenceWire(envelope({ evidence: [], integrity_status: "degraded" })),
    ).toThrow(/inconsistente/);
  });

  it("rejects a resolver version or actions flag that is not the approved contract", () => {
    expect(() =>
      parseEffectiveEvidenceWire(envelope({ resolver_version: "ku-interpretation-v1" })),
    ).toThrow(/inconsistente/);
    expect(() => parseEffectiveEvidenceWire(envelope({ actions_applied: false }))).toThrow(
      /inconsistente/,
    );
  });

  it("rejects a bare evidence list", () => {
    expect(() => parseEffectiveEvidenceWire([evidenceRow])).toThrow(/incompleta/);
  });
});

describe("readEffectiveLearningEvidence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the approved RPC without a profile id", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: envelope(), error: null });
    supabase.getClient.mockReturnValue({ rpc });

    const reading = await readEffectiveLearningEvidence();

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("read_effective_learning_evidence");
    expect(reading.evidence.map((item) => item.questionId)).toEqual([1003]);
    expect(repositorySource).not.toMatch(/\.from\(|profile_id|evidence_actions|p_profile/);
    expect(repositorySource).not.toMatch(/mastery|proficiency|confidence|recommendation|priority/i);
    expect(repositorySource).not.toMatch(/request_question_delivery|assign_next_questions/);
  });

  it("does not invent evidence when the RPC fails", async () => {
    supabase.getClient.mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: null, error: new Error("authentication required") }),
    });

    await expect(readEffectiveLearningEvidence()).rejects.toThrow(/authentication required/);
  });
});
