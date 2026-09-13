import { useState } from "react";

import type { SubjectPerformance as SubjectPerformanceData } from "@/features/study/types/SubjectPerformance";
import { getInitiallyVisibleSubjects } from "../services/getInitiallyVisibleSubjects";

type SubjectPerformanceProps = {
  subjects: SubjectPerformanceData[];
  prioritySubject?: string;
};

export function SubjectPerformance({
  subjects,
  prioritySubject,
}: SubjectPerformanceProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const visibleSubjects = isExpanded
    ? subjects
    : getInitiallyVisibleSubjects(subjects, prioritySubject);
  const hasMoreSubjects = subjects.length > 3;

  return (
    <section
      aria-labelledby="subject-performance-title"
      className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 md:p-8"
    >
      <h2
        id="subject-performance-title"
        className="text-2xl font-bold text-white"
      >
        Desempenho por disciplina
      </h2>
      {subjects.length === 0 ? (
        <p className="mt-4 text-slate-400">
          Seu desempenho por disciplina aparecerá após as primeiras respostas.
        </p>
      ) : (
        <div className="mt-6 space-y-5">
          {visibleSubjects.map((subject) => (
            <article key={subject.subject}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-white">
                    {subject.subject}
                    {subject.subject === prioritySubject && (
                      <span className="ml-2 text-xs font-bold uppercase tracking-wide text-amber-300">
                        Prioridade
                      </span>
                    )}
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {subject.questionsAnswered}{" "}
                    {subject.questionsAnswered === 1
                      ? "questão respondida"
                      : "questões respondidas"}
                  </p>
                </div>
                <span className="font-bold text-blue-400">
                  {subject.accuracy}%
                </span>
              </div>
              <div
                aria-label={`Aproveitamento em ${subject.subject}`}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={subject.accuracy}
                className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800"
                role="progressbar"
              >
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{ width: `${subject.accuracy}%` }}
                />
              </div>
            </article>
          ))}
        </div>
      )}
      {hasMoreSubjects && (
        <button
          aria-expanded={isExpanded}
          className="mt-6 text-sm font-semibold text-blue-400 transition hover:text-blue-300"
          onClick={() => setIsExpanded((current) => !current)}
          type="button"
        >
          {isExpanded ? "Mostrar menos disciplinas" : "Ver desempenho completo"}
        </button>
      )}
    </section>
  );
}
