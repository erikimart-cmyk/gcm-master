import type { SubjectPerformance as SubjectPerformanceData } from "@/features/study/types/SubjectPerformance";

type SubjectPerformanceProps = {
  subjects: SubjectPerformanceData[];
};

export function SubjectPerformance({ subjects }: SubjectPerformanceProps) {
  return (
    <section aria-labelledby="subject-performance-title" className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 md:p-8">
      <h2 id="subject-performance-title" className="text-2xl font-bold text-white">
        Desempenho por disciplina
      </h2>
      {subjects.length === 0 ? (
        <p className="mt-4 text-slate-400">
          Seu desempenho por disciplina aparecerá após as primeiras respostas.
        </p>
      ) : (
        <div className="mt-6 space-y-5">
          {subjects.map((subject) => (
            <article key={subject.subject}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-white">{subject.subject}</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {subject.questionsAnswered} {subject.questionsAnswered === 1 ? "questão respondida" : "questões respondidas"}
                  </p>
                </div>
                <span className="font-bold text-blue-400">{subject.accuracy}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${subject.accuracy}%` }} />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
