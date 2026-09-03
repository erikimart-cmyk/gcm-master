import { useStudyProgress } from "@/features/landing/context/StudyProgressContext";
import { studyGoals } from "@/features/study/types/StudyGoal";
import { GoalCard } from "./GoalCard";

const goalIcons: Record<(typeof studyGoals)[number]["id"], string> = {
  concursos: "🎯",
  idiomas: "🌍",
  tecnologia: "💻",
  "novas-habilidades": "📚",
  carreira: "📈",
  explorar: "✨",
};

export function GoalGrid() {
  const { studyGoal, setStudyGoal } = useStudyProgress();

  return (
    <section className="mt-16">

      <h2 className="mb-8 text-center text-2xl font-bold">
        Quem você deseja se tornar?
      </h2>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {studyGoals.map((goal) => (
          <GoalCard
            key={goal.id}
            {...goal}
            icon={goalIcons[goal.id]}
            selected={studyGoal?.id === goal.id}
            onClick={() => setStudyGoal(goal)}
          />
        ))}
      </div>

    </section>
  );
}
