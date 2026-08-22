import { useNavigate } from "react-router-dom";
const subjects = [
  {
    name: "Português",
    icon: "📚",
    progress: 72,
  },
  {
    name: "Direito Constitucional",
    icon: "⚖️",
    progress: 45,
  },
];

export function DashboardPreview() {
  const navigate = useNavigate();
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl backdrop-blur">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Dashboard ZYNVO
        </h3>

        <span className="rounded-full bg-blue-500 px-3 py-1 text-xs font-medium">
          IA Ativa
        </span>
      </div>

      <div className="space-y-4">
        {subjects.map((subject) => (
          <div
            key={subject.name}
            className="rounded-xl bg-slate-800 p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-base">
                {subject.icon} {subject.name}
              </span>

              <span className="text-sm text-slate-300">
                {subject.progress}%
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-700">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{ width: `${subject.progress}%` }}
              />
            </div>
          </div>
        ))}

        <div className="rounded-xl bg-slate-800 p-4">
          🧠 IA preparando sua próxima revisão personalizada
        </div>

        <div className="rounded-xl bg-slate-800 p-5">
  <div className="flex items-start gap-3">
    <span className="text-2xl">🧠</span>

    <div className="flex-1">
      <p className="text-sm font-semibold text-blue-400">
        Recomendação ZYNVO
      </p>

      <p className="mt-2 text-base leading-6 text-white">
        Seu desempenho em Direito Constitucional está abaixo
        das demais matérias.
      </p>

      <p className="mt-2 text-sm text-slate-400">
        A ZYNVO recomenda uma revisão de 20 minutos para
        reforçar esse conteúdo.
      </p>

      <button
        type="button"
        onClick={() => navigate("/revisao")}
        className="mt-4 rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-600"
      >
        Começar revisão →
      </button>
    </div>
  </div>
</div>
              <div className="mt-8">
        <h4 className="mb-4 text-lg font-semibold">
          Seu desempenho
        </h4>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-800 p-4">
            <p className="text-sm text-slate-400">
              Questões respondidas
            </p>

            <p className="mt-1 text-2xl font-bold text-white">
              248
            </p>
          </div>

          <div className="rounded-xl bg-slate-800 p-4">
            <p className="text-sm text-slate-400">
              Aproveitamento
            </p>

            <p className="mt-1 text-2xl font-bold text-blue-400">
              76%
            </p>
          </div>

          <div className="rounded-xl bg-slate-800 p-4">
            <p className="text-sm text-slate-400">
              Horas estudadas
            </p>

            <p className="mt-1 text-2xl font-bold text-white">
              18h 40min
            </p>
          </div>

          <div className="rounded-xl bg-slate-800 p-4">
            <p className="text-sm text-slate-400">
              Sequência atual
            </p>

            <p className="mt-1 text-2xl font-bold text-blue-400">
              7 dias 🔥
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}