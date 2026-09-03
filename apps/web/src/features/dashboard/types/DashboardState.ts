export type DashboardProgress = {
  questionsAnswered: number;
  correctAnswers: number;
  wrongAnswers: number;
};

export type NextStep = {
  state: "initial" | "up-to-date" | "review";
  title: string;
  description: string;
  actionLabel: string;
  actionPath: "/revisao" | "/revisao/questoes";
};

export type DashboardState = {
  accuracy: number | null;
  attentionState: "initial" | "up-to-date" | "priority";
  nextStep: NextStep;
};
