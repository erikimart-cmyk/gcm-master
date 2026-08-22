import { Logo } from "../../ui/Logo/Logo";

export function Header() {
  return (
    <header className="border-b border-slate-800">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Logo />

        <nav>
          <ul className="flex gap-6 text-slate-300">
            <li>Início</li>
            <li>Recursos</li>
            <li>Planos</li>
            <li>Entrar</li>
          </ul>
        </nav>
      </div>
    </header>
  );
}