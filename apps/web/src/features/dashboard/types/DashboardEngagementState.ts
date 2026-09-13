import type { NextStep } from "./DashboardState";

export type DailyMission = {
  state: "first-step" | "practice" | "review";
  eyebrow: string;
  title: string;
  description: string;
  actionLabel: string;
  actionPath: NextStep["actionPath"] | "/onboarding";
};

export type DashboardEngagementState = {
  mission: DailyMission;
  narrative: ProgressNarrative;
};

export type ProgressNarrative = {
  title: string;
  description: string;
  tone: "initial" | "positive" | "attention";
};
