import { beforeEach, describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({
  getClient: vi.fn(),
}));

vi.mock("@/features/auth/lib/supabase", () => ({
  getSupabaseClient: supabase.getClient,
}));

import { loadStudyTrack } from "./StudyTrackRepository";

const exam = {
  name: "Prefeitura de Limeira · Concurso Público 02/2026",
  organizing_body: "AVANÇASP",
  position_name: "Guarda Civil Municipal – 3ª Classe",
};

function mockTrackRow(exams: unknown) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: {
      exam_id: "gcm-vunesp-pilot",
      exams,
    },
    error: null,
  });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  supabase.getClient.mockReturnValue({ from });
}

describe("loadStudyTrack", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hidrata exams quando o embed chega como objeto", async () => {
    mockTrackRow(exam);

    await expect(loadStudyTrack("user-1")).resolves.toEqual({
      examId: "gcm-vunesp-pilot",
      title: exam.name,
      organizingBody: exam.organizing_body,
      positionName: exam.position_name,
    });
  });

  it("hidrata exams quando o embed chega como array", async () => {
    mockTrackRow([exam]);

    await expect(loadStudyTrack("user-1")).resolves.toEqual({
      examId: "gcm-vunesp-pilot",
      title: exam.name,
      organizingBody: exam.organizing_body,
      positionName: exam.position_name,
    });
  });

  it("retorna null quando exams é null", async () => {
    mockTrackRow(null);

    await expect(loadStudyTrack("user-1")).resolves.toBeNull();
  });
});
