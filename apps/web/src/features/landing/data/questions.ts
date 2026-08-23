import type { Question } from "@/features/questions/types/Question";

export const questions: Question[] = [
  {
    id: 1,
    country: "BR",
    language: "pt-BR",
    bank: "VUNESP",
    exam: "GCM",
    position: "Guarda Civil Municipal",
    year: 2026,

    subject: "Direito Constitucional",
    topic: "Princípios Fundamentais",
    difficulty: "medium",

    statement:
      "Qual princípio fundamental está relacionado à dignidade da pessoa humana?",

    alternatives: [
      {
        id: "A",
        text: "Soberania nacional",
      },
      {
        id: "B",
        text: "Dignidade da pessoa humana",
      },
      {
        id: "C",
        text: "Livre iniciativa",
      },
      {
        id: "D",
        text: "Pluralismo político",
      },
    ],

    correctAnswer: "B",

    explanation:
      "A dignidade da pessoa humana é um dos fundamentos da República Federativa do Brasil.",

    tags: [
      "constituição federal",
      "princípios fundamentais",
      "direitos fundamentais",
    ],
  },

  {
    id: 2,
    country: "BR",
    language: "pt-BR",
    bank: "VUNESP",
    exam: "GCM",
    position: "Guarda Civil Municipal",
    year: 2026,

    subject: "Direito Constitucional",
    topic: "Direitos e Garantias Fundamentais",
    difficulty: "medium",

    statement:
      "Qual documento estabelece os direitos e garantias fundamentais no Brasil?",

    alternatives: [
      {
        id: "A",
        text: "Código Civil",
      },
      {
        id: "B",
        text: "Código Penal",
      },
      {
        id: "C",
        text: "Constituição Federal",
      },
      {
        id: "D",
        text: "Código de Trânsito Brasileiro",
      },
    ],

    correctAnswer: "C",

    explanation:
      "A Constituição Federal de 1988 estabelece os direitos e garantias fundamentais.",

    tags: [
      "constituição federal",
      "direitos fundamentais",
    ],
  },

  {
    id: 3,
    country: "BR",
    language: "pt-BR",
    bank: "VUNESP",
    exam: "GCM",
    position: "Guarda Civil Municipal",
    year: 2026,

    subject: "Português",
    topic: "Ortografia",
    difficulty: "easy",

    statement:
      "Assinale a alternativa em que a palavra está escrita corretamente.",

    alternatives: [
      {
        id: "A",
        text: "Excessão",
      },
      {
        id: "B",
        text: "Exceção",
      },
      {
        id: "C",
        text: "Esceção",
      },
      {
        id: "D",
        text: "Excessão",
      },
    ],

    correctAnswer: "B",

    explanation:
      "A forma correta da palavra é 'exceção'.",

    tags: [
      "ortografia",
      "língua portuguesa",
    ],
  },

  {
    id: 4,
    country: "BR",
    language: "pt-BR",
    bank: "VUNESP",
    exam: "GCM",
    position: "Guarda Civil Municipal",
    year: 2026,

    subject: "Matemática",
    topic: "Porcentagem",
    difficulty: "easy",

    statement:
      "Quanto é 25% de 200?",

    alternatives: [
      {
        id: "A",
        text: "25",
      },
      {
        id: "B",
        text: "40",
      },
      {
        id: "C",
        text: "50",
      },
      {
        id: "D",
        text: "75",
      },
    ],

    correctAnswer: "C",

    explanation:
      "25% de 200 corresponde a 50.",

    tags: [
      "porcentagem",
      "matemática básica",
    ],
  },

  {
    id: 5,
    country: "BR",
    language: "pt-BR",
    bank: "VUNESP",
    exam: "GCM",
    position: "Guarda Civil Municipal",
    year: 2026,

    subject: "Raciocínio Lógico",
    topic: "Lógica de Conjuntos",
    difficulty: "medium",

    statement:
      "Se todo A é B e todo B é C, podemos concluir que:",

    alternatives: [
      {
        id: "A",
        text: "Todo C é A",
      },
      {
        id: "B",
        text: "Nenhum A é C",
      },
      {
        id: "C",
        text: "Todo A é C",
      },
      {
        id: "D",
        text: "Nenhum B é C",
      },
    ],

    correctAnswer: "C",

    explanation:
      "Se todo A pertence ao conjunto B e todo B pertence ao conjunto C, então todo A também pertence ao conjunto C.",

    tags: [
      "raciocínio lógico",
      "conjuntos",
      "proposições",
    ],
  },
];