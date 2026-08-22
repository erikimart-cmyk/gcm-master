export type Question = {
  id: number;
  subject: string;
  statement: string;
  alternatives: string[];
  correctAnswer: number;
  explanation: string;
};

export const questions: Question[] = [
  {
    id: 1,
    subject: "Direito Constitucional",
    statement:
      "Qual princípio fundamental está relacionado à dignidade da pessoa humana?",
    alternatives: [
      "Soberania nacional",
      "Dignidade da pessoa humana",
      "Livre iniciativa",
      "Pluralismo político",
    ],
    correctAnswer: 1,
    explanation:
      "A dignidade da pessoa humana é um dos fundamentos da República Federativa do Brasil.",
  },

  {
    id: 2,
    subject: "Direito Constitucional",
    statement:
      "Qual documento estabelece os direitos e garantias fundamentais no Brasil?",
    alternatives: [
      "Código Civil",
      "Código Penal",
      "Constituição Federal",
      "Código de Trânsito Brasileiro",
    ],
    correctAnswer: 2,
    explanation:
      "A Constituição Federal de 1988 estabelece os direitos e garantias fundamentais.",
  },

  {
    id: 3,
    subject: "Português",
    statement:
      "Assinale a alternativa em que a palavra está escrita corretamente.",
    alternatives: [
      "Excessão",
      "Exceção",
      "Esceção",
      "Excessão",
    ],
    correctAnswer: 1,
    explanation:
      "A forma correta da palavra é 'exceção'.",
  },

  {
    id: 4,
    subject: "Matemática",
    statement:
      "Quanto é 25% de 200?",
    alternatives: [
      "25",
      "40",
      "50",
      "75",
    ],
    correctAnswer: 2,
    explanation:
      "25% de 200 corresponde a 50.",
  },

  {
    id: 5,
    subject: "Raciocínio Lógico",
    statement:
      "Se todo A é B e todo B é C, podemos concluir que:",
    alternatives: [
      "Todo C é A",
      "Nenhum A é C",
      "Todo A é C",
      "Nenhum B é C",
    ],
    correctAnswer: 2,
    explanation:
      "Se todo A pertence ao conjunto B e todo B pertence ao conjunto C, então todo A também pertence ao conjunto C.",
  },
];