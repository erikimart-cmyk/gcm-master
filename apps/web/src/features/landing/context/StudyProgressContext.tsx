import { calculateSubjectPerformance } from "@/features/study/services/SubjectPerformanceCalculator";
import { prioritizeSubjects } from "@/features/study/services/SubjectPriorityEngine";
import type { SubjectPerformance } from "@/features/study/types/SubjectPerformance";
import type { StudyGoal } from "@/features/study/types/StudyGoal";
import {
  loadStudyGoal,
  saveStudyGoal,
} from "@/features/study/repositories/StudyGoalRepository";
import { hydrateStudyGoal } from "@/features/study/services/hydrateStudyGoal";
import {
  loadStudyTrack,
  saveStudyTrack,
  type PersistedStudyTrack,
} from "@/features/study/repositories/StudyTrackRepository";
import {
  loadQuestionAttempts,
  saveQuestionAttempt,
} from "@/features/study/repositories/StudyProgressRepository";
import { hydrateQuestionResults } from "@/features/study/services/hydrateQuestionResults";
import { useAuth } from "@/features/auth/context/useAuth";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { QuestionResult } from "@/features/questions/types/QuestionResult";
import type { Question } from "@/features/questions/types/Question";
import { questions } from "@/features/landing/data/questions";
import { selectReviewQuestions } from "@/features/study/services/ReviewQuestionSelector";

type StudyProgress = {
  questionsAnswered: number;
  correctAnswers: number;
  wrongAnswers: number;
  studySessions: number;
  questionResults: QuestionResult[];
};

type StudyProgressContextValue = {
  studyGoal: StudyGoal | null;

  setStudyGoal: (goal: StudyGoal) => Promise<void>;

  isStudyGoalLoading: boolean;

  isStudyGoalSaving: boolean;

  studyGoalError: string | null;

  studyTrack: PersistedStudyTrack | null;

  setStudyTrack: (examId: string) => Promise<void>;

  isStudyTrackLoading: boolean;

  isStudyTrackSaving: boolean;

  studyTrackError: string | null;

  isProgressLoading: boolean;

  isQuestionResultSaving: boolean;

  progressError: string | null;

  reviewQuestions: Question[];

  progress: StudyProgress;

  subjectPerformance: SubjectPerformance[];

  prioritizedSubjects: SubjectPerformance[];

  registerQuestionResult: (
    questionId: number,
    subject: string,
    correct: boolean,
    isReview?: boolean,
  ) => Promise<boolean>;

  registerReviewResult: (
    questions: number,
    correct: number,
    wrong: number,
  ) => void;
};

const StudyProgressContext = createContext<StudyProgressContextValue | null>(
  null,
);

export function StudyProgressProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const userId = user?.id;
  const [studyGoal, setStudyGoal] = useState<StudyGoal | null>(null);
  const [isStudyGoalLoading, setIsStudyGoalLoading] = useState(
    () => Boolean(userId),
  );
  const [isStudyGoalSaving, setIsStudyGoalSaving] = useState(false);
  const [studyGoalError, setStudyGoalError] = useState<string | null>(null);
  const [studyTrack, setStudyTrack] = useState<PersistedStudyTrack | null>(
    null,
  );
  const [isStudyTrackLoading, setIsStudyTrackLoading] = useState(() =>
    Boolean(userId),
  );
  const [isStudyTrackSaving, setIsStudyTrackSaving] = useState(false);
  const [studyTrackError, setStudyTrackError] = useState<string | null>(null);
  const [isProgressLoading, setIsProgressLoading] = useState(() =>
    Boolean(userId),
  );
  const [isQuestionResultSaving, setIsQuestionResultSaving] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);

  const [progress, setProgress] = useState<StudyProgress>({
    questionsAnswered: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    studySessions: 0,
    questionResults: [],
  });

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!userId) {
      return;
    }

    let isActive = true;

    void loadStudyGoal(userId)
      .then((persistedGoal) => {
        if (!isActive) {
          return;
        }

        const hydratedGoal = hydrateStudyGoal(persistedGoal?.goalId ?? null);

        if (persistedGoal && !hydratedGoal) {
          setStudyGoalError(
            "Não foi possível carregar seu objetivo de estudo. Escolha um novo objetivo para continuar.",
          );
        }

        setStudyGoal(hydratedGoal);
      })
      .catch(() => {
        if (isActive) {
          setStudyGoalError(
            "Não foi possível carregar seu objetivo de estudo. Tente recarregar a página.",
          );
        }
      })
      .finally(() => {
        if (isActive) {
          setIsStudyGoalLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [isAuthLoading, userId]);

  useEffect(() => {
    if (isAuthLoading || !userId) {
      return;
    }

    let isActive = true;

    void loadStudyTrack(userId)
      .then((track) => {
        if (isActive) {
          setStudyTrack(track);
        }
      })
      .catch(() => {
        if (isActive) {
          setStudyTrackError(
            "Não foi possível carregar sua trilha de estudos. Tente recarregar a página.",
          );
        }
      })
      .finally(() => {
        if (isActive) {
          setIsStudyTrackLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [isAuthLoading, userId]);

  useEffect(() => {
    if (isAuthLoading || !userId) {
      return;
    }

    let isActive = true;

    void loadQuestionAttempts(userId)
      .then((attempts) => {
        if (!isActive) {
          return;
        }

        const questionResults = hydrateQuestionResults(attempts);
        const correctAnswers = questionResults.filter(
          (result) => result.correct,
        ).length;

        setProgress((current) => ({
          ...current,
          questionsAnswered: questionResults.length,
          correctAnswers,
          wrongAnswers: questionResults.length - correctAnswers,
          questionResults,
        }));
      })
      .catch(() => {
        if (isActive) {
          setProgressError(
            "Não foi possível carregar seu histórico de questões. Tente recarregar a página.",
          );
        }
      })
      .finally(() => {
        if (isActive) {
          setIsProgressLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [isAuthLoading, userId]);

  const updateStudyGoal = useCallback(
    async (goal: StudyGoal) => {
      if (!userId) {
        setStudyGoalError(
          "Sua sessão expirou. Entre novamente para salvar seu objetivo.",
        );
        return;
      }

      setIsStudyGoalSaving(true);
      setStudyGoalError(null);

      try {
        await saveStudyGoal(userId, goal.id);
        setStudyGoal(goal);
      } catch {
        setStudyGoalError(
          "Não foi possível salvar seu objetivo de estudo. Tente novamente.",
        );
      } finally {
        setIsStudyGoalSaving(false);
      }
    },
    [userId],
  );

  const updateStudyTrack = useCallback(
    async (examId: string) => {
      if (!userId) {
        setStudyTrackError(
          "Sua sessão expirou. Entre novamente para salvar sua trilha.",
        );
        return;
      }

      setIsStudyTrackSaving(true);
      setStudyTrackError(null);

      try {
        await saveStudyTrack(userId, examId);
        const track = await loadStudyTrack(userId);
        setStudyTrack(track);
      } catch {
        setStudyTrackError(
          "Não foi possível salvar sua trilha de estudos. Tente novamente.",
        );
      } finally {
        setIsStudyTrackSaving(false);
      }
    },
    [userId],
  );

  const subjectPerformance = useMemo(
    () => calculateSubjectPerformance(progress.questionResults),
    [progress.questionResults],
  );

  const prioritizedSubjects = useMemo(
    () => prioritizeSubjects(subjectPerformance),
    [subjectPerformance],
  );

  const reviewQuestions = useMemo(
    () => selectReviewQuestions(questions, progress.questionResults),
    [progress.questionResults],
  );

  const registerQuestionResult = useCallback(
    async (
      questionId: number,
      subject: string,
      correct: boolean,
      isReview = false,
    ) => {
      if (!userId) {
        setProgressError(
          "Sua sessão expirou. Entre novamente para registrar sua resposta.",
        );
        return false;
      }

      if (isProgressLoading) {
        setProgressError(
          "Seu histórico ainda está sendo carregado. Aguarde um instante para responder.",
        );
        return false;
      }

      setIsQuestionResultSaving(true);
      setProgressError(null);

      try {
        const savedAttempt = await saveQuestionAttempt({
          questionId,
          subject,
          correct,
          isReview,
        });
        const result = hydrateQuestionResults([savedAttempt])[0];

        setProgress((current) => ({
          ...current,
          questionsAnswered: current.questionsAnswered + 1,
          correctAnswers: current.correctAnswers + (correct ? 1 : 0),
          wrongAnswers: current.wrongAnswers + (correct ? 0 : 1),
          questionResults: [...current.questionResults, result],
        }));

        return true;
      } catch {
        setProgressError(
          "Não foi possível registrar sua resposta. Tente novamente.",
        );
        return false;
      } finally {
        setIsQuestionResultSaving(false);
      }
    },
    [isProgressLoading, userId],
  );

  const registerReviewResult = useCallback(
    (questions: number, correct: number, wrong: number) => {
      setProgress((current) => ({
        ...current,

        questionsAnswered: current.questionsAnswered + questions,

        correctAnswers: current.correctAnswers + correct,

        wrongAnswers: current.wrongAnswers + wrong,

        studySessions: current.studySessions + 1,
      }));
    },
    [],
  );

  const value = useMemo(
    () => ({
      studyGoal,

      setStudyGoal: updateStudyGoal,

      isStudyGoalLoading,

      isStudyGoalSaving,

      studyGoalError,

      studyTrack,

      setStudyTrack: updateStudyTrack,

      isStudyTrackLoading,

      isStudyTrackSaving,

      studyTrackError,

      isProgressLoading,

      isQuestionResultSaving,

      progressError,

      progress,

      subjectPerformance,

      prioritizedSubjects,

      reviewQuestions,

      registerQuestionResult,

      registerReviewResult,
    }),
    [
      studyGoal,
      isStudyGoalLoading,
      isStudyGoalSaving,
      studyGoalError,
      studyTrack,
      isStudyTrackLoading,
      isStudyTrackSaving,
      studyTrackError,
      isProgressLoading,
      isQuestionResultSaving,
      progressError,
      progress,
      subjectPerformance,
      prioritizedSubjects,
      reviewQuestions,
      registerQuestionResult,
      registerReviewResult,
      updateStudyGoal,
      updateStudyTrack,
    ],
  );

  return (
    <StudyProgressContext.Provider value={value}>
      {children}
    </StudyProgressContext.Provider>
  );
}

// The hook is deliberately colocated with its provider as the public API of
// this feature; it is not a component eligible for Fast Refresh.
// eslint-disable-next-line react-refresh/only-export-components
export function useStudyProgress() {
  const context = useContext(StudyProgressContext);

  if (!context) {
    throw new Error(
      "useStudyProgress deve ser usado dentro de StudyProgressProvider.",
    );
  }

  return context;
}
