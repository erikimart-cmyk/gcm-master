import { calculateSubjectPerformance } from "@/features/study/services/SubjectPerformanceCalculator";
import { prioritizeSubjects } from "@/features/study/services/SubjectPriorityEngine";
import type { SubjectPerformance } from "@/features/study/types/SubjectPerformance";

import {
  createContext,
  useContext,
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
  reviewQuestions: Question[];

  progress: StudyProgress;

  subjectPerformance: SubjectPerformance[];

  prioritizedSubjects: SubjectPerformance[];

  registerQuestionResult: (
    questionId: number,
    subject: string,
    correct: boolean,
    isReview?: boolean,
  ) => void;

  registerReviewResult: (
    questions: number,
    correct: number,
    wrong: number,
  ) => void;
};

const StudyProgressContext =
  createContext<StudyProgressContextValue | null>(null);

export function StudyProgressProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [progress, setProgress] = useState<StudyProgress>({
    questionsAnswered: 0,
    correctAnswers: 0,
    wrongAnswers: 0,
    studySessions: 0,
    questionResults: [],
  });

  const subjectPerformance = useMemo(
    () =>
      calculateSubjectPerformance(
        progress.questionResults,
      ),
    [progress.questionResults],
  );

  const prioritizedSubjects = useMemo(
    () =>
      prioritizeSubjects(
        subjectPerformance,
      ),
    [subjectPerformance],
  );

  const reviewQuestions = useMemo(
    () =>
      selectReviewQuestions(
        questions,
        progress.questionResults,
      ),
    [progress.questionResults],
  );

  const registerQuestionResult = (
    questionId: number,
    subject: string,
    correct: boolean,
    isReview = false,
  ) => {
    const previousAttempts =
      progress.questionResults.filter(
        (item) => item.questionId === questionId,
      ).length;

    const attempt = previousAttempts + 1;

    const result: QuestionResult = {
      questionId,
      subject,
      correct,
      answeredAt: new Date().toISOString(),
      attempt,
      isReview,
    };

    setProgress((current) => ({
      ...current,

      questionsAnswered:
        current.questionsAnswered + 1,

      correctAnswers:
        current.correctAnswers +
        (correct ? 1 : 0),

      wrongAnswers:
        current.wrongAnswers +
        (correct ? 0 : 1),

      questionResults: [
        ...current.questionResults,
        result,
      ],
    }));
  };

  const registerReviewResult = (
    questions: number,
    correct: number,
    wrong: number,
  ) => {
    setProgress((current) => ({
      ...current,

      questionsAnswered:
        current.questionsAnswered + questions,

      correctAnswers:
        current.correctAnswers + correct,

      wrongAnswers:
        current.wrongAnswers + wrong,

      studySessions:
        current.studySessions + 1,
    }));
  };

  const value = useMemo(
    () => ({
      progress,

      subjectPerformance,

      prioritizedSubjects,

      reviewQuestions,

      registerQuestionResult,

      registerReviewResult,
    }),
    [
      progress,
      subjectPerformance,
      prioritizedSubjects,
      reviewQuestions,
    ],
  );

  return (
    <StudyProgressContext.Provider value={value}>
      {children}
    </StudyProgressContext.Provider>
  );
}

export function useStudyProgress() {
  const context = useContext(
    StudyProgressContext,
  );

  if (!context) {
    throw new Error(
      "useStudyProgress deve ser usado dentro de StudyProgressProvider.",
    );
  }

  return context;
}
