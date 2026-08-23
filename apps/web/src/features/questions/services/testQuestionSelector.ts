import { questions } from "@/features/landing/data/questions";
import { selectQuestions } from "./QuestionSelector";

const vunespQuestions = selectQuestions(questions, {
  bankId: "vunesp",
});

console.log(
  "Questões vunesp:",
  vunespQuestions.length,
);

const constitutionalQuestions = selectQuestions(
  questions,
  {
    bankId: "vunesp",
    subject: "Direito Constitucional",
  },
);

console.log(
  "Direito Constitucional:",
  constitutionalQuestions.length,
);

const mediumQuestions = selectQuestions(
  questions,
  {
    difficulty: "medium",
  },
);

console.log(
  "Questões médias:",
  mediumQuestions.length,
);