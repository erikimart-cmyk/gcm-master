const journeySteps = [
  {
    label: "Escolha sua meta",
    detail: "Concursos, idiomas, tecnologia e mais",
    icon: "✦",
    tone: "border-blue-400/60 text-blue-100",
  },
  {
    label: "Pratique no seu ritmo",
    detail: "Questões e conteúdos que fazem sentido",
    icon: "◌",
    tone: "border-cyan-400/60 text-cyan-50",
  },
  {
    label: "Enxergue sua evolução",
    detail: "Seu progresso aparece a cada resposta",
    icon: "↗",
    tone: "border-violet-400/60 text-violet-50",
  },
];

export function DashboardPreview() {
  return (
    <div className="relative w-full max-w-md">
      <div aria-hidden="true" className="absolute inset-8 -z-10 rounded-full bg-gradient-to-br from-blue-500/30 via-cyan-400/15 to-violet-500/30 blur-3xl animate-[pulse_6s_ease-in-out_infinite] motion-reduce:animate-none" />

      <div className="relative overflow-hidden rounded-[2rem] border border-slate-700/80 bg-slate-900/80 p-5 shadow-[0_30px_80px_rgba(2,6,23,0.7)] backdrop-blur-xl sm:p-7">
        <div aria-hidden="true" className="absolute -right-16 -top-16 h-40 w-40 rounded-full border border-cyan-300/20 bg-cyan-400/10 animate-[spin_24s_linear_infinite] motion-reduce:animate-none" />
        <div aria-hidden="true" className="absolute -bottom-20 -left-16 h-44 w-44 rounded-full border border-violet-300/20 bg-violet-500/10 animate-[spin_30s_linear_infinite_reverse] motion-reduce:animate-none" />

        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Prévia da jornada</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Seu caminho ganha clareza</h2>
          </div>
          <span className="rounded-full border border-violet-300/30 bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-100">DEMONSTRAÇÃO</span>
        </div>

        <p className="relative mt-3 text-sm leading-6 text-slate-400">
          Veja como a ZYNVO organiza sua experiência de estudo.
        </p>

        <div className="relative mt-7 space-y-3">
          {journeySteps.map((step, index) => (
            <div key={step.label} className="relative">
              {index < journeySteps.length - 1 && (
                <div aria-hidden="true" className="absolute left-6 top-12 h-5 border-l border-dashed border-blue-300/35" />
              )}
              <div className={`flex items-center gap-4 border-l-2 py-3 pl-4 ${step.tone}`}>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-current/20 bg-slate-950/45 text-lg shadow-inner">{step.icon}</span>
                <div>
                  <p className="font-semibold">{step.label}</p>
                  <p className="mt-1 text-sm text-slate-300">{step.detail}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="relative mt-6 rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-violet-500 text-sm shadow-[0_0_20px_rgba(96,165,250,0.5)]">Z</span>
            <p className="text-sm leading-6 text-slate-200">Fluxo demonstrativo. Sua jornada começa pelo botão principal.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
