import { useState } from "react";
import { GoalCard } from "./GoalCard";

const goals = [
  {
    icon: "🎯",
    title: "Concursos",
    description: "Prepare-se para conquistar sua aprovação.",
  },
  {
    icon: "🌍",
    title: "Idiomas",
    description: "Aprenda um novo idioma no seu ritmo.",
  },
  {
    icon: "💻",
    title: "Tecnologia",
    description: "Desenvolva habilidades para o mercado digital.",
  },
  {
    icon: "📚",
    title: "Novas Habilidades",
    description: "Aprenda qualquer competência que desejar.",
  },
  {
    icon: "📈",
    title: "Carreira",
    description: "Impulsione sua evolução profissional.",
  },
  {
    icon: "✨",
    title: "Explorar",
    description: "Descubra novas possibilidades de aprendizado.",
  },
];

export function GoalGrid() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <section className="mt-16">

      <h2 className="mb-8 text-center text-2xl font-bold">
        Quem você deseja se tornar?
      </h2>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {goals.map((goal) => (
          <GoalCard
            key={goal.title}
            {...goal}
            selected={selected === goal.title}
            onClick={() => setSelected(goal.title)}
          />
        ))}
      </div>

    </section>
  );
}