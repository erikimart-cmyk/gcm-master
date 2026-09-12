import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/layouts/MainLayout", () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/features/study/repositories/ReviewContentRepository", () => ({
  loadPublishedReviewContents: vi.fn(),
  recordReviewContentProgress: vi.fn(),
}));

import { ReviewContentPage } from "./ReviewContentPage";

describe("ReviewContentPage", () => {
  it("monta em estado seguro e oferece navegação de retorno sem acessar a rede", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/revisao/conteudo"]}>
        <ReviewContentPage />
      </MemoryRouter>,
    );

    expect(html).toContain("Conteúdo de revisão");
    expect(html).toContain('href="/revisao"');
    expect(html).toContain('role="status"');
    expect(html).toContain("Carregando conteúdo de revisão");
  });
});
