import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { CanonicalStudyView } from "./CanonicalStudyView";
import type { CanonicalStudyViewState } from "@/features/study/types/CanonicalStudy";
import type { DeliveredQuestion } from "@/features/study/types/CanonicalStudy";

const question: DeliveredQuestion = {
  assignmentId: "asg-1",
  questionVersionId: "qv-1",
  questionId: 7,
  statement: "Enunciado da questão canônica",
  alternatives: [
    { id: "A", text: "Primeira" },
    { id: "B", text: "Segunda" },
  ],
  difficulty: "medium",
  subjectLabel: "Português",
  topicLabel: "Concordância",
  presentationContext: "study",
};

function renderView(state: CanonicalStudyViewState) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <CanonicalStudyView
        state={state}
        levelUp={null}
        statementRef={createRef<HTMLHeadingElement>()}
        resultRef={createRef<HTMLDivElement>()}
        onSelectAlternative={() => undefined}
        onNext={() => undefined}
        onRetry={() => undefined}
        onGoReview={() => undefined}
        onGoDashboard={() => undefined}
      />
    </MemoryRouter>,
  );
}

describe("CanonicalStudyView", () => {
  it("keeps alternatives disabled while confirming presentation", () => {
    const html = renderView({
      phase: "RENDERED_CONFIRMING",
      question,
      result: null,
      selectedAnswer: null,
      recordedCount: 0,
      correctAnswers: 0,
      wrongAnswers: 0,
      statusMessage:
        "Confirmando apresentação da questão. As alternativas serão habilitadas em instantes.",
      errorMessage: null,
      alternativesEnabled: false,
      sessionCap: 5,
    });

    expect(html).toContain('role="status"');
    expect(html).toContain("Confirmando apresentação da questão");
    expect(html).toContain("disabled");
    expect(html).toContain("Enunciado da questão canônica");
  });

  it("renders RECORDED results from the server and uses safe copy when explanation is null", () => {
    const html = renderView({
      phase: "ANSWERED",
      question,
      result: {
        assignmentId: "asg-1",
        attemptId: "att-1",
        selectedAnswer: "A",
        isCorrect: false,
        correctAnswer: null,
        explanation: null,
      },
      selectedAnswer: "A",
      recordedCount: 1,
      correctAnswers: 0,
      wrongAnswers: 1,
      statusMessage: null,
      errorMessage: null,
      alternativesEnabled: false,
      sessionCap: 5,
    });

    expect(html).toContain("Você errou esta questão");
    expect(html).toContain("Resposta registrada.");
    expect(html).not.toContain("Resposta canônica");
    expect(html).toContain('role="progressbar"');
  });

  it("highlights the canonical alternative only when the server key is present", () => {
    const html = renderView({
      phase: "ANSWERED",
      question,
      result: {
        assignmentId: "asg-1",
        attemptId: "att-1",
        selectedAnswer: "A",
        isCorrect: false,
        correctAnswer: "B",
        explanation: "Porque B.",
      },
      selectedAnswer: "A",
      recordedCount: 1,
      correctAnswers: 0,
      wrongAnswers: 1,
      statusMessage: null,
      errorMessage: null,
      alternativesEnabled: false,
      sessionCap: 5,
    });

    expect(html).toContain("Resposta canônica");
    expect(html).toContain("Porque B.");
    expect(html).toContain("Sua resposta");
  });
});
