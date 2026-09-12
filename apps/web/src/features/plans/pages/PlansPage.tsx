import { Link } from "react-router-dom";

import { useAuth } from "@/features/auth/context/useAuth";
import { MainLayout } from "@/layouts/MainLayout";

const plannedPlans = [
  {
    name: "Evolução",
    description:
      "Para quem quiser ampliar a jornada quando novos recursos forem lançados.",
    accent: "border-blue-400/25 bg-blue-500/5",
  },
  {
    name: "Premium",
    description:
      "Para uma experiência avançada, definida junto com a expansão da plataforma.",
    accent: "border-violet-400/25 bg-violet-500/5",
  },
];

export function PlansPage() {
  const { user } = useAuth();

  return (
    <MainLayout>
      <section className="relative isolate overflow-hidden px-6 py-16 sm:py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          <div className="absolute -left-36 top-0 h-96 w-96 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="absolute -right-32 top-24 h-[28rem] w-[28rem] rounded-full bg-violet-600/15 blur-3xl" />
        </div>

        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
              Planos ZYNVO
            </p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
              Sua jornada começa livre para evoluir.
            </h1>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              A ZYNVO atende diferentes metas de estudo. Comece pelo plano Free
              e acompanhe, com clareza, os próximos caminhos da plataforma.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            <article className="rounded-3xl border border-cyan-300/35 bg-slate-900/85 p-7 shadow-2xl shadow-cyan-950/20">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-white">Plano Free</h2>
                <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-200">
                  Disponível agora
                </span>
              </div>
              <p className="mt-4 leading-7 text-slate-300">
                Para conhecer a ZYNVO, definir sua meta e iniciar uma jornada de
                estudo com o catálogo disponível.
              </p>
              <ul className="mt-6 space-y-3 text-sm leading-6 text-slate-200">
                <li>✓ Criação de conta sem cartão de crédito</li>
                <li>✓ Escolha da área e da jornada inicial</li>
                <li>✓ Questões, revisão e acompanhamento de progresso</li>
              </ul>
              <Link
                className="mt-8 inline-flex rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 px-5 py-3 font-semibold text-white shadow-lg shadow-blue-950/40 transition hover:scale-[1.02] hover:from-blue-400 hover:to-violet-500"
                state={user ? undefined : { mode: "sign-up" }}
                to={user ? "/onboarding" : "/auth"}
              >
                {user ? "Configurar minha jornada →" : "Criar conta grátis →"}
              </Link>
            </article>

            {plannedPlans.map((plan) => (
              <article
                className={`rounded-3xl border p-7 ${plan.accent}`}
                key={plan.name}
              >
                <span className="rounded-full border border-slate-600 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Em breve
                </span>
                <h2 className="mt-5 text-2xl font-bold text-white">
                  Plano {plan.name}
                </h2>
                <p className="mt-4 leading-7 text-slate-300">{plan.description}</p>
                <p className="mt-8 border-t border-slate-700/70 pt-5 text-sm leading-6 text-slate-400">
                  Recursos, condições e valores serão apresentados com
                  transparência antes do lançamento.
                </p>
              </article>
            ))}
          </div>

          <p className="mt-8 max-w-3xl text-sm leading-6 text-slate-400">
            Nesta fase não há cobrança nem contratação de plano. A estrutura
            existe para a plataforma crescer por áreas, sem confundir o acesso
            inicial com uma oferta de pagamento.
          </p>
        </div>
      </section>
    </MainLayout>
  );
}
