import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  loadPublishedReviewContents,
  recordReviewContentProgress,
  type ReviewContent,
} from "@/features/study/repositories/ReviewContentRepository";
import { MainLayout } from "@/layouts/MainLayout";

export function ReviewContentPage() {
  const navigate = useNavigate();
  const [contents, setContents] = useState<ReviewContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingContentId, setCompletingContentId] = useState<string | null>(null);

  useEffect(() => {
    void loadPublishedReviewContents()
      .then((publishedContents) => {
        setContents(publishedContents);
        void Promise.all(
          publishedContents.map((content) =>
            recordReviewContentProgress(content.id, false),
          ),
        ).catch(() => {
          // The lesson itself remains available if telemetry cannot be saved.
        });
      })
      .catch(() => {
        setError(
          "Não foi possível carregar o conteúdo de revisão. Tente novamente.",
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handlePractice = async (contentId: string) => {
    setCompletingContentId(contentId);

    try {
      await recordReviewContentProgress(contentId, true);
      navigate("/revisao/questoes");
    } catch {
      setError(
        "Não foi possível registrar a conclusão do conteúdo. Tente novamente.",
      );
      setCompletingContentId(null);
    }
  };

  return (
    <MainLayout>
      <main className="mx-auto max-w-4xl px-6 py-16 text-white">
        <Link
          className="text-sm font-semibold text-blue-400 transition hover:text-blue-300"
          to="/revisao"
        >
          ← Voltar para revisão
        </Link>

        <header className="mt-8">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-violet-300">
            Conteúdo de revisão
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            Reforce a base antes de voltar à prática
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-400">
            Leia no seu ritmo, veja um exemplo resolvido e retorne às questões
            quando se sentir pronto.
          </p>
        </header>

        {isLoading && (
          <p className="mt-10 text-slate-400" role="status">
            Carregando conteúdo de revisão...
          </p>
        )}

        {error && (
          <p className="mt-10 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-100" role="alert">
            {error}
          </p>
        )}

        {!isLoading && !error && contents.length === 0 && (
          <p className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-slate-300">
            Ainda não há conteúdo de revisão publicado para esta trilha.
          </p>
        )}

        <div className="mt-10 space-y-8">
          {contents.map((content) => (
            <article
              key={content.id}
              className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl shadow-black/10 md:p-8"
            >
              <p className="text-sm font-semibold uppercase tracking-wide text-blue-400">
                {content.subject} · {content.topic}
              </p>
              <h2 className="mt-3 text-3xl font-bold">{content.title}</h2>

              <section className="mt-8">
                <h3 className="text-lg font-bold text-violet-200">
                  O que você vai revisar
                </h3>
                <p className="mt-2 leading-7 text-slate-300">
                  {content.learningObjective}
                </p>
              </section>

              <section className="mt-8">
                <h3 className="text-lg font-bold text-violet-200">Explicação</h3>
                <p className="mt-2 leading-7 text-slate-300">
                  {content.explanation}
                </p>
              </section>

              <section className="mt-8 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5">
                <h3 className="font-bold text-blue-200">Exemplo resolvido</h3>
                <p className="mt-2 leading-7 text-slate-200">
                  {content.workedExample}
                </p>
              </section>

              {content.commonMistake && (
                <section className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5">
                  <h3 className="font-bold text-amber-200">Erro comum a evitar</h3>
                  <p className="mt-2 leading-7 text-slate-200">
                    {content.commonMistake}
                  </p>
                </section>
              )}

              <button
                type="button"
                onClick={() => void handlePractice(content.id)}
                disabled={completingContentId === content.id}
                className="mt-8 inline-flex rounded-xl bg-blue-600 px-6 py-3 font-bold transition hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-300"
              >
                {completingContentId === content.id
                  ? "Preparando prática..."
                  : `Praticar ${content.topic.toLowerCase()} →`}
              </button>
            </article>
          ))}
        </div>
      </main>
    </MainLayout>
  );
}
