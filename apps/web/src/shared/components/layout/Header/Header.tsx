import { Logo } from "../../ui/Logo/Logo";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "@/features/auth/context/useAuth";

export function Header() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  async function handleSignOut() {
    await signOut();
    navigate("/", { replace: true });
  }

  return (
    <header className="border-b border-slate-800">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Logo />

        <nav className="hidden sm:block">
          <ul className="flex gap-6 text-slate-300">
            <li>Início</li>
            <li>Recursos</li>
            <li>Planos</li>
            <li>
              {user ? (
                <button onClick={handleSignOut} type="button">
                  Sair
                </button>
              ) : (
                <Link to="/auth">Entrar</Link>
              )}
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
