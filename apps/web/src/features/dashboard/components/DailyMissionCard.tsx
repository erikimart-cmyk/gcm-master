import { Link } from "react-router-dom";

import type { DailyMission } from "../types/DashboardEngagementState";

type DailyMissionCardProps = {
  mission: DailyMission;
  isLoading: boolean;
};

const missionIcon: Record<DailyMission["state"], string> = {
  "first-step": "✦",
  practice: "↗",
  review: "◎",
};

export function DailyMissionCard({
  mission,
  isLoading,
}: DailyMissionCardProps) {
  if (isLoading) {
    return (
      <section
        aria-busy="true"
        aria-label="Carregando missão de estudo"
        className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-600/20 via-blue-600/15 to-slate-900 p-6 md:p-8"
      >
        <p className="text-sm text-violet-200">Preparando sua missão de estudo...</p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="daily-mission-title"
      className="overflow-hidden rounded-3xl border border-violet-400/25 bg-gradient-to-br from-violet-600/30 via-blue-600/20 to-slate-900 p-6 shadow-2xl shadow-violet-950/20 md:p-8"
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-violet-200">
            {missionIcon[mission.state]} {mission.eyebrow}
          </p>
          <h2
            id="daily-mission-title"
            className="mt-3 text-2xl font-black tracking-tight text-white md:text-3xl"
          >
            {mission.title}
          </h2>
          <p className="mt-3 max-w-xl leading-7 text-slate-200">
            {mission.description}
          </p>
        </div>

        <Link
          to={mission.actionPath}
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-white px-5 py-3 font-bold text-slate-950 transition hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {mission.actionLabel} →
        </Link>
      </div>
    </section>
  );
}
