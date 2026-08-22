import { MainLayout } from "@/layouts/MainLayout";

export function ReviewPage() {
  return (
    <MainLayout>
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-10">
          <span className="inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-400">
            Revisão personalizada
          </span>

          <h1 className="mt-6 text-4xl font-bold text-white md:text-5xl">
            Sua revisão
          </h1>

          <p className="mt-4 max-w-2xl text-lg text-slate-400">
            A ZYNVO identificou os conteúdos que merecem mais atenção
            para melhorar seu desempenho.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8">
          <h2 className="text-2xl font-semibold text-white">
            Direito Constitucional
          </h2>

          <p className="mt-3 text-slate-400">
            Seu desempenho atual está em 45%. Vamos reforçar esse conteúdo
            com uma revisão direcionada.
          </p>

          <button
            type="button"
            className="mt-8 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-500"
          >
            Iniciar revisão
          </button>
        </div>
      </section>
    </MainLayout>
  );
}