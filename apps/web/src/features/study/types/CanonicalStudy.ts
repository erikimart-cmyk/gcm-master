export type CanonicalAlternative = {
  id: string;
  text: string;
};

export type DeliveredQuestion = {
  assignmentId: string;
  questionVersionId: string;
  questionId: number;
  statement: string;
  alternatives: CanonicalAlternative[];
  difficulty: string;
  subjectLabel: string;
  topicLabel: string;
  presentationContext: string;
};

export type AnsweredQuestionResult = {
  assignmentId: string;
  attemptId: string;
  selectedAnswer: string;
  isCorrect: boolean;
  correctAnswer?: string | null;
  explanation?: string | null;
};

export type DeliveryOutcome =
  | { kind: "DELIVERED"; question: DeliveredQuestion }
  | { kind: "UNAVAILABLE" }
  | { kind: "CONTEXT_NOT_READY" }
  | { kind: "DENIED" };

export type PresentationOutcome =
  | { kind: "CONFIRMED"; assignmentId: string; presentedAt: string | null }
  | { kind: "UNAVAILABLE" }
  | { kind: "CONTEXT_NOT_READY" }
  | { kind: "DENIED" };

export type ResponseOutcome =
  | { kind: "RECORDED"; result: AnsweredQuestionResult }
  | { kind: "CONFLICT" }
  | { kind: "UNAVAILABLE" }
  | { kind: "DENIED" };

export type CanonicalStudyPhase =
  | "IDLE"
  | "REQUESTING_DELIVERY"
  | "RENDERED_CONFIRMING"
  | "READY"
  | "SUBMITTING"
  | "ANSWERED"
  | "SESSION_DONE"
  | "UNAVAILABLE"
  | "CONTEXT_NOT_READY"
  | "DENIED"
  | "ERROR_RETRYABLE"
  | "CONFLICT";

export const CANONICAL_STUDY_SESSION_CAP = 5;

export const PENDING_SUBMISSION_STORAGE_PREFIX = "zynvo:m2c:sub:";

export type PendingStudySubmission = {
  submissionId: string;
  selectedAnswer: string;
};

export type CanonicalStudyViewState = {
  phase: CanonicalStudyPhase;
  question: DeliveredQuestion | null;
  result: AnsweredQuestionResult | null;
  selectedAnswer: string | null;
  recordedCount: number;
  correctAnswers: number;
  wrongAnswers: number;
  statusMessage: string | null;
  errorMessage: string | null;
  alternativesEnabled: boolean;
  sessionCap: number;
};
