import { beforeEach, describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({
  getClient: vi.fn(),
}));

vi.mock("@/features/auth/lib/supabase", () => ({
  getSupabaseClient: supabase.getClient,
}));

import {
  loadPublishedReviewContents,
  recordReviewContentProgress,
} from "./ReviewContentRepository";

describe("ReviewContentRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mapeia conteúdo publicado usando somente um cliente simulado", async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: "content-1",
          title: "Controle de constitucionalidade",
          learning_objective: "Reconhecer os modelos de controle.",
          explanation: "Explicação local.",
          worked_example: "Exemplo local.",
          common_mistake: null,
          topics: [
            { name: "Controle", subjects: [{ name: "Constitucional" }] },
          ],
        },
      ],
      error: null,
    });
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    supabase.getClient.mockReturnValue({ from });

    await expect(loadPublishedReviewContents()).resolves.toEqual([
      {
        id: "content-1",
        subject: "Constitucional",
        topic: "Controle",
        title: "Controle de constitucionalidade",
        learningObjective: "Reconhecer os modelos de controle.",
        explanation: "Explicação local.",
        workedExample: "Exemplo local.",
        commonMistake: null,
      },
    ]);
    expect(from).toHaveBeenCalledWith("review_contents");
    expect(eq).toHaveBeenCalledWith("status", "published");
  });

  it("valida o contrato de conclusão sem efetuar gravação remota", async () => {
    const rpc = vi.fn().mockResolvedValue({ error: null });
    supabase.getClient.mockReturnValue({ rpc });

    await recordReviewContentProgress("content-1", true);

    expect(rpc).toHaveBeenCalledWith("record_review_content_progress", {
      p_review_content_id: "content-1",
      p_completed: true,
    });
  });
});
