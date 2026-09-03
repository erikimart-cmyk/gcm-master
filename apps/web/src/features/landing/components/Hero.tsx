import { Button } from "@/shared/components/ui/Button";
import { useNavigate } from "react-router-dom";
import { DashboardPreview } from "./DashboardPreview";

export function Hero() {
  const navigate = useNavigate();

  const highlights = [
    "IA Personalizada",
    "Concursos Públicos",
    "Cursos",
    "Idiomas",
  ];
  return (
    <section className="relative overflow-hidden py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-3xl">

          <span className="mb-6 inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-400">
            Plataforma inteligente para evolução contínua
          </span>

          <h1 className="text-5xl font-bold leading-tight text-white md:text-7xl">
            Aprenda.
            <br />
            Evolua.
            <br />
            Conquiste.
          </h1>

          <p className="mt-8 max-w-2xl text-xl leading-8 text-zinc-400">
            A ZYNVO reúne concursos, cursos, tecnologia, idiomas e inteligência
            artificial em uma única plataforma para acelerar sua evolução.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <section className="mx-auto flex min-h-[75vh] max-w-7xl items-center px-6">

  <div className="grid w-full gap-16 lg:grid-cols-2 lg:items-center">

    {/* Coluna esquerda */}
    <div>
      {/* Aqui permanece todo o conteúdo atual:
          badge
          título
          subtítulo
          botões
          texto inferior
      */}
    </div>

    {/* Coluna direita */}
    <div className="flex justify-center lg:justify-end">
      <DashboardPreview />
    </div>

  </div>

</section>

            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate("/onboarding")}
            >
              Começar gratuitamente
            </Button>

            <Button variant="outline" size="lg">
              Conhecer recursos
            </Button>

          </div>
          
          <div className="mt-10 flex flex-wrap gap-3">
  {highlights.map((item) => (
    <span
      key={item}
      className="rounded-full border border-slate-700 bg-slate-900/60 px-4 py-2 text-sm text-slate-300"
    >
      ✓ {item}
    </span>
  ))}
</div>

          <p className="mt-8 text-sm text-zinc-500">
            Sem cartão de crédito • Acesso imediato • Evolua no seu ritmo
          </p>

        </div>
      </div>
    </section>
  );
}
