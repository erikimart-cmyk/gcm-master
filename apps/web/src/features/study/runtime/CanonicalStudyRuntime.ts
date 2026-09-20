import type { CanonicalStudyClient } from "@/features/study/repositories/CanonicalStudyRepository";
import { CanonicalStudyTransportError } from "@/features/study/repositories/CanonicalStudyRepository";
import {
  clearPendingStudySubmission,
  isCanonicalPendingUserId,
  persistPendingStudySubmission,
  readPendingStudySubmission,
  shouldClearPendingOnResponse,
  type PendingSubmissionStorage,
} from "@/features/study/services/pendingStudySubmission";
import type {
  AnsweredQuestionResult,
  CanonicalStudyViewState,
  DeliveredQuestion,
} from "@/features/study/types/CanonicalStudy";
import { CANONICAL_STUDY_SESSION_CAP } from "@/features/study/types/CanonicalStudy";

export type CanonicalStudyRuntimeDeps = {
  userId: string;
  client: CanonicalStudyClient;
  storage: PendingSubmissionStorage;
  createSubmissionId: () => string;
  onRecorded: (input: {
    question: DeliveredQuestion;
    result: AnsweredQuestionResult;
  }) => void;
};

const CONFIRMING_STATUS =
  "Confirmando apresentação da questão. As alternativas serão habilitadas em instantes.";
const SUBMITTING_STATUS = "Registrando sua resposta...";
const REQUESTING_STATUS = "Preparando sua próxima questão...";
const TRANSPORT_ERROR =
  "Não foi possível concluir esta etapa. Tente novamente.";
const CONFLICT_MESSAGE =
  "Não foi possível reconciliar esta resposta. Recarregue a página para continuar com segurança.";
const UNAVAILABLE_RESPONSE_MESSAGE =
  "Esta questão não está mais disponível para resposta.";
const DENIED_MESSAGE =
  "Sua sessão expirou. Entre novamente para continuar.";

export class CanonicalStudyRuntime {
  private readonly userId: string;
  private readonly client: CanonicalStudyClient;
  private readonly storage: PendingSubmissionStorage;
  private readonly createSubmissionId: CanonicalStudyRuntimeDeps["createSubmissionId"];
  private readonly onRecorded: CanonicalStudyRuntimeDeps["onRecorded"];
  private readonly listeners = new Set<(state: CanonicalStudyViewState) => void>();

  private phase: CanonicalStudyViewState["phase"] = "IDLE";
  private question: DeliveredQuestion | null = null;
  private result: AnsweredQuestionResult | null = null;
  private selectedAnswer: string | null = null;
  private recordedCount = 0;
  private correctAnswers = 0;
  private wrongAnswers = 0;
  private statusMessage: string | null = null;
  private errorMessage: string | null = null;

  private deliveryInFlight = false;
  private confirmInFlightId: string | null = null;
  private confirmedAssignmentId: string | null = null;
  private submitLocked = false;
  private submissionId: string | null = null;
  private retryTarget: "delivery" | "confirm" | "submit" | null = null;
  private recoveringPending = false;

  constructor(deps: CanonicalStudyRuntimeDeps) {
    this.userId = deps.userId;
    this.client = deps.client;
    this.storage = deps.storage;
    this.createSubmissionId = deps.createSubmissionId;
    this.onRecorded = deps.onRecorded;
  }

  subscribe(listener: (state: CanonicalStudyViewState) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  snapshot(): CanonicalStudyViewState {
    return {
      phase: this.phase,
      question: this.question,
      result: this.result,
      selectedAnswer: this.selectedAnswer,
      recordedCount: this.recordedCount,
      correctAnswers: this.correctAnswers,
      wrongAnswers: this.wrongAnswers,
      statusMessage: this.statusMessage,
      errorMessage: this.errorMessage,
      alternativesEnabled: this.phase === "READY",
      sessionCap: CANONICAL_STUDY_SESSION_CAP,
    };
  }

  async start(): Promise<void> {
    if (this.phase !== "IDLE") {
      return;
    }

    if (!isCanonicalPendingUserId(this.userId)) {
      this.applyClosedOutcome("DENIED");
      return;
    }

    await this.requestDelivery();
  }

  async notifyRendered(assignmentId: string): Promise<void> {
    if (this.question?.assignmentId !== assignmentId) {
      return;
    }

    if (this.phase === "SUBMITTING" || this.phase === "ANSWERED") {
      return;
    }

    if (this.confirmedAssignmentId === assignmentId) {
      if (this.phase === "RENDERED_CONFIRMING") {
        this.enterReady();
        await this.recoverPendingIfPresent();
      }
      return;
    }

    if (this.confirmInFlightId === assignmentId) {
      return;
    }

    this.confirmInFlightId = assignmentId;
    this.phase = "RENDERED_CONFIRMING";
    this.statusMessage = CONFIRMING_STATUS;
    this.errorMessage = null;
    this.emit();

    try {
      const outcome = await this.client.confirmPresentation(assignmentId);

      if (this.question?.assignmentId !== assignmentId) {
        return;
      }

      if (outcome.kind === "CONFIRMED") {
        this.confirmedAssignmentId = assignmentId;
        this.enterReady();
        await this.recoverPendingIfPresent();
        return;
      }

      this.applyClosedOutcome(outcome.kind);
    } catch (error) {
      if (this.question?.assignmentId !== assignmentId) {
        return;
      }

      this.retryTarget = "confirm";
      this.enterRetryable(error);
    } finally {
      if (this.confirmInFlightId === assignmentId) {
        this.confirmInFlightId = null;
      }
    }
  }

  submit(answerId: string): void {
    if (!isCanonicalPendingUserId(this.userId)) {
      this.applyClosedOutcome("DENIED");
      return;
    }

    if (this.phase !== "READY") {
      return;
    }

    if (this.submitLocked) {
      return;
    }

    if (!this.question || this.confirmedAssignmentId !== this.question.assignmentId) {
      return;
    }

    this.submitLocked = true;
    this.selectedAnswer = answerId;
    this.submissionId =
      this.submissionId ?? this.createSubmissionId();
    const submissionId = this.submissionId;
    const assignmentId = this.question.assignmentId;

    persistPendingStudySubmission(this.storage, this.userId, assignmentId, {
      submissionId,
      selectedAnswer: answerId,
    });

    this.phase = "SUBMITTING";
    this.statusMessage = SUBMITTING_STATUS;
    this.errorMessage = null;
    this.emit();

    void this.performSubmit(assignmentId, answerId, submissionId);
  }

  retry(): void {
    if (this.phase !== "ERROR_RETRYABLE") {
      return;
    }

    if (
      this.retryTarget === "submit" &&
      this.selectedAnswer &&
      this.submissionId &&
      this.question
    ) {
      if (!isCanonicalPendingUserId(this.userId)) {
        this.applyClosedOutcome("DENIED");
        return;
      }

      this.submitLocked = true;
      this.phase = "SUBMITTING";
      this.statusMessage = SUBMITTING_STATUS;
      this.errorMessage = null;
      this.emit();
      void this.performSubmit(
        this.question.assignmentId,
        this.selectedAnswer,
        this.submissionId,
      );
      return;
    }

    if (this.retryTarget === "confirm" && this.question) {
      this.phase = "RENDERED_CONFIRMING";
      this.statusMessage = CONFIRMING_STATUS;
      this.errorMessage = null;
      this.emit();
      void this.notifyRendered(this.question.assignmentId);
      return;
    }

    void this.requestDelivery();
  }

  next(): void {
    if (this.phase !== "ANSWERED") {
      return;
    }

    if (this.recordedCount >= CANONICAL_STUDY_SESSION_CAP) {
      this.phase = "SESSION_DONE";
      this.statusMessage = null;
      this.emit();
      return;
    }

    this.question = null;
    this.result = null;
    this.selectedAnswer = null;
    this.submissionId = null;
    this.submitLocked = false;
    this.confirmedAssignmentId = null;
    this.confirmInFlightId = null;
    this.recoveringPending = false;
    void this.requestDelivery();
  }

  private enterReady(): void {
    this.phase = "READY";
    this.statusMessage = null;
    this.errorMessage = null;
    this.emit();
  }

  private async recoverPendingIfPresent(): Promise<void> {
    if (!this.question || this.recoveringPending) {
      return;
    }

    if (!isCanonicalPendingUserId(this.userId)) {
      return;
    }

    const pending = readPendingStudySubmission(
      this.storage,
      this.userId,
      this.question.assignmentId,
    );

    if (!pending) {
      return;
    }

    this.recoveringPending = true;
    this.submissionId = pending.submissionId;
    this.selectedAnswer = pending.selectedAnswer;
    this.submitLocked = true;
    this.phase = "SUBMITTING";
    this.statusMessage = SUBMITTING_STATUS;
    this.emit();

    await this.performSubmit(
      this.question.assignmentId,
      pending.selectedAnswer,
      pending.submissionId,
    );
  }

  private async performSubmit(
    assignmentId: string,
    selectedAnswer: string,
    submissionId: string,
  ): Promise<void> {
    try {
      const outcome = await this.client.submitResponse(
        assignmentId,
        selectedAnswer,
        submissionId,
      );

      if (this.question?.assignmentId !== assignmentId) {
        return;
      }

      if (outcome.kind === "RECORDED") {
        if (shouldClearPendingOnResponse(outcome.kind)) {
          clearPendingStudySubmission(this.storage, this.userId, assignmentId);
        }

        this.result = outcome.result;
        this.selectedAnswer = outcome.result.selectedAnswer;
        this.recordedCount += 1;
        if (outcome.result.isCorrect) {
          this.correctAnswers += 1;
        } else {
          this.wrongAnswers += 1;
        }
        this.phase = "ANSWERED";
        this.statusMessage = null;
        this.errorMessage = null;
        this.submitLocked = false;
        this.retryTarget = null;
        this.recoveringPending = false;
        this.onRecorded({
          question: this.question,
          result: outcome.result,
        });
        this.emit();
        return;
      }

      if (outcome.kind === "CONFLICT") {
        this.phase = "CONFLICT";
        this.errorMessage = CONFLICT_MESSAGE;
        this.statusMessage = null;
        this.submitLocked = false;
        this.recoveringPending = false;
        this.emit();
        return;
      }

      if (outcome.kind === "UNAVAILABLE") {
        this.phase = "UNAVAILABLE";
        this.errorMessage = UNAVAILABLE_RESPONSE_MESSAGE;
        this.statusMessage = null;
        this.submitLocked = false;
        this.recoveringPending = false;
        this.emit();
        return;
      }

      this.applyClosedOutcome("DENIED");
    } catch (error) {
      if (this.question?.assignmentId !== assignmentId) {
        return;
      }

      this.retryTarget = "submit";
      this.submitLocked = false;
      this.recoveringPending = false;
      this.enterRetryable(error);
    }
  }

  private async requestDelivery(): Promise<void> {
    if (this.phase === "SUBMITTING") {
      return;
    }

    if (this.deliveryInFlight) {
      return;
    }

    if (this.recordedCount >= CANONICAL_STUDY_SESSION_CAP) {
      this.phase = "SESSION_DONE";
      this.statusMessage = null;
      this.emit();
      return;
    }

    this.deliveryInFlight = true;
    this.phase = "REQUESTING_DELIVERY";
    this.statusMessage = REQUESTING_STATUS;
    this.errorMessage = null;
    this.question = null;
    this.result = null;
    this.emit();

    try {
      const outcome = await this.client.requestStudyQuestion();

      if (outcome.kind === "DELIVERED") {
        this.question = outcome.question;
        this.phase = "RENDERED_CONFIRMING";
        this.statusMessage = CONFIRMING_STATUS;
        this.retryTarget = null;
        this.emit();
        return;
      }

      if (outcome.kind === "UNAVAILABLE") {
        this.phase =
          this.recordedCount > 0 ? "SESSION_DONE" : "UNAVAILABLE";
        this.statusMessage = null;
        this.emit();
        return;
      }

      this.applyClosedOutcome(outcome.kind);
    } catch (error) {
      this.retryTarget = "delivery";
      this.enterRetryable(error);
    } finally {
      this.deliveryInFlight = false;
    }
  }

  private applyClosedOutcome(
    kind: "CONTEXT_NOT_READY" | "DENIED" | "UNAVAILABLE",
  ): void {
    this.submitLocked = false;
    this.recoveringPending = false;
    this.statusMessage = null;

    if (kind === "CONTEXT_NOT_READY") {
      this.phase = "CONTEXT_NOT_READY";
      this.errorMessage = null;
    } else if (kind === "DENIED") {
      this.phase = "DENIED";
      this.errorMessage = DENIED_MESSAGE;
    } else {
      this.phase = this.recordedCount > 0 ? "SESSION_DONE" : "UNAVAILABLE";
      this.errorMessage = null;
    }

    this.emit();
  }

  private enterRetryable(error: unknown): void {
    this.phase = "ERROR_RETRYABLE";
    this.statusMessage = null;
    this.errorMessage =
      error instanceof CanonicalStudyTransportError
        ? TRANSPORT_ERROR
        : TRANSPORT_ERROR;
    this.emit();
  }

  private emit(): void {
    const snapshot = this.snapshot();
    this.listeners.forEach((listener) => {
      listener(snapshot);
    });
  }
}
