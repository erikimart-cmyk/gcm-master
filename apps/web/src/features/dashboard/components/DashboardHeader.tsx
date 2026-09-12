import { Link } from "react-router-dom";

export function DashboardHeader() {
  return (
    <header className="flex flex-wrap items-start justify-between gap-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">
          Visão geral
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">
          Olá 👋
        </h1>
        <p className="mt-3 text-lg text-slate-400">
          Continue construindo sua evolução.
        </p>
      </div>

      <Link
        className="rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm text-slate-300 transition hover:border-blue-400/60 hover:text-white"
        to="/planos"
      >
        Plano Free <span className="ml-1 text-blue-300">Conhecer planos →</span>
      </Link>
    </header>
  );
}
