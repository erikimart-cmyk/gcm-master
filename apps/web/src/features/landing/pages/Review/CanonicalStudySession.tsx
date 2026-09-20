import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/features/auth/context/useAuth";
import { useStudyProgress } from "@/features/landing/context/StudyProgressContext";
import { canonicalStudyClient } from "@/features/study/repositories/CanonicalStudyRepository";
import { CanonicalStudyRuntime } from "@/features/study/runtime/CanonicalStudyRuntime";
import { CanonicalStudyView } from "@/features/study/runtime/CanonicalStudyView";
import { browserPendingSubmissionStorage } from "@/features/study/services/pendingStudySubmission";
import type { CanonicalStudyViewState } from "@/features/study/types/CanonicalStudy";
import { CANONICAL_STUDY_SESSION_CAP } from "@/features/study/types/CanonicalStudy";
import type { StudyLevel } from "@/features/study/types/StudyLevel";

function createSubmissionId(): string {
  return crypto.randomUUID();
}

const missingIdentityState: CanonicalStudyViewState = {
  phase: "DENIED",
  question: null,
  result: null,
  selectedAnswer: null,
  recordedCount: 0,
  correctAnswers: 0,
  wrongAnswers: 0,
  statusMessage: null,
  errorMessage: "Sua sessão expirou. Entre novamente para continuar.",
  alternativesEnabled: false,
  sessionCap: CANONICAL_STUDY_SESSION_CAP,
};

export function CanonicalStudySession() {
  const { user } = useAuth();

  if (!user?.id) {
    return <CanonicalStudyMissingIdentity />;
  }

  return <AuthenticatedCanonicalStudySession userId={user.id} />;
}

function CanonicalStudyMissingIdentity() {
  const navigate = useNavigate();
  const statementRef = useRef<HTMLHeadingElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  return (
    <CanonicalStudyView
      state={missingIdentityState}
      levelUp={null}
      statementRef={statementRef}
      resultRef={resultRef}
      onSelectAlternative={() => undefined}
      onNext={() => undefined}
      onRetry={() => undefined}
      onGoReview={() => navigate("/revisao")}
      onGoDashboard={() => navigate("/dashboard")}
    />
  );
}

function AuthenticatedCanonicalStudySession({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const { recordCanonicalProgress } = useStudyProgress();
  const [levelUp, setLevelUp] = useState<StudyLevel | null>(null);

  const [runtime] = useState(
    () =>
      new CanonicalStudyRuntime({
        userId,
        client: canonicalStudyClient,
        storage: browserPendingSubmissionStorage(),
        createSubmissionId,
        onRecorded: ({ question, result }) => {
          const registration = recordCanonicalProgress({
            questionId: question.questionId,
            subject: question.subjectLabel,
            topic: question.topicLabel,
            correct: result.isCorrect,
          });
          setLevelUp(registration.levelUp);
        },
      }),
  );

  const [state, setState] = useState<CanonicalStudyViewState>(() =>
    runtime.snapshot(),
  );
  const statementRef = useRef<HTMLHeadingElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const lastFocusedAssignment = useRef<string | null>(null);
  const lastFocusedResult = useRef<string | null>(null);

  useEffect(() => {
    return runtime.subscribe((next) => {
      setState(next);
    });
  }, [runtime]);

  useEffect(() => {
    void runtime.start();
  }, [runtime]);

  useEffect(() => {
    if (state.phase !== "RENDERED_CONFIRMING" || !state.question) {
      return;
    }

    void runtime.notifyRendered(state.question.assignmentId);
  }, [runtime, state.phase, state.question]);

  useEffect(() => {
    if (!state.question) {
      return;
    }

    if (lastFocusedAssignment.current === state.question.assignmentId) {
      return;
    }

    lastFocusedAssignment.current = state.question.assignmentId;
    statementRef.current?.focus();
  }, [state.question]);

  useEffect(() => {
    if (state.phase !== "ANSWERED" || !state.result) {
      return;
    }

    const key = `${state.result.assignmentId}:${state.result.attemptId}`;
    if (lastFocusedResult.current === key) {
      return;
    }

    lastFocusedResult.current = key;
    resultRef.current?.focus();
  }, [state.phase, state.result]);

  return (
    <CanonicalStudyView
      state={state}
      levelUp={state.phase === "ANSWERED" ? levelUp : null}
      statementRef={statementRef}
      resultRef={resultRef}
      onSelectAlternative={(answerId) => {
        runtime.submit(answerId);
      }}
      onNext={() => {
        setLevelUp(null);
        runtime.next();
      }}
      onRetry={() => {
        runtime.retry();
      }}
      onGoReview={() => navigate("/revisao")}
      onGoDashboard={() => navigate("/dashboard")}
    />
  );
}
