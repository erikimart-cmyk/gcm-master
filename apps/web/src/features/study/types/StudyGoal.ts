export type StudyGoal = {
  id: string;
  title: string;
  description?: string;
};

export const studyGoals = [
  {
    id: "concursos",
    title: "Concursos",
    description: "Prepare-se para conquistar sua aprovação.",
  },
  {
    id: "idiomas",
    title: "Idiomas",
    description: "Aprenda um novo idioma no seu ritmo.",
  },
  {
    id: "tecnologia",
    title: "Tecnologia",
    description: "Desenvolva habilidades para o mercado digital.",
  },
  {
    id: "novas-habilidades",
    title: "Novas Habilidades",
    description: "Aprenda qualquer competência que desejar.",
  },
  {
    id: "carreira",
    title: "Carreira",
    description: "Impulsione sua evolução profissional.",
  },
  {
    id: "explorar",
    title: "Explorar",
    description: "Descubra novas possibilidades de aprendizado.",
  },
] as const satisfies readonly StudyGoal[];

export function findStudyGoal(goalId: string): StudyGoal | null {
  return studyGoals.find((goal) => goal.id === goalId) ?? null;
}
