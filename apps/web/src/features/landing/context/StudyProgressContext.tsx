import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type StudyProgress = {
  questionsAnswered: number;
  correctAnswers: number;
  wrongAnswers: number;
  studySessions: number;
};

type StudyProgressContextValue = {
  progress: StudyProgress;

  registerQuestionResult: (
    correct: boolean,
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
  });

  const registerQuestionResult = (correct: boolean) => {
  setProgress((current) => ({
    ...current,

    questionsAnswered:
      current.questionsAnswered + 1,

    correctAnswers:
      current.correctAnswers + (correct ? 1 : 0),

    wrongAnswers:
      current.wrongAnswers + (correct ? 0 : 1),
  }));
};

  const registerReviewResult = (
    questions: number,
    correct: number,
    wrong: number,
  ) => {
    setProgress((current) => ({
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
    registerQuestionResult,
    registerReviewResult,
  }),
  [progress],
);

  return (
    <StudyProgressContext.Provider value={value}>
      {children}
    </StudyProgressContext.Provider>
  );
}

export function useStudyProgress() {
  const context = useContext(StudyProgressContext);

  if (!context) {
    throw new Error(
      "useStudyProgress deve ser usado dentro de StudyProgressProvider.",
    );
  }

  return context;
}