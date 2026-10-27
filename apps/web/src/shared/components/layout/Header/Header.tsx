import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "@/features/auth/context/useAuth";
import {
  accountSignOutFailedMessage,
  runAccountSignOut,
} from "@/features/auth/lib/accountSessionActions";

import { Logo } from "../../ui/Logo/Logo";

export type HeaderSessionControlProps = {
  user: { id: string } | null;
  signingOut: boolean;
  error: string | null;
  onSignOut: () => void;
};

export function HeaderSessionControl({
  user,
  signingOut,
  error,
  onSignOut,
}: HeaderSessionControlProps) {
  if (!user) {
    return (
      <Link className="transition hover:text-white" to="/auth">
        Entrar
      </Link>
    );
  }

  return (
    <span className="relative inline-flex flex-col items-end">
      <button
        aria-busy={signingOut}
        className="transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 disabled:cursor-not-allowed disabled:text-zinc-500"
        disabled={signingOut}
        onClick={onSignOut}
        type="button"
      >
        {signingOut ? "Saindo…" : "Sair"}
      </button>
      {error ? (
        <p className="absolute top-full right-0 z-10 mt-1 w-max max-w-[16rem] text-left text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </span>
  );
}

export function Header() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const signOutInFlightRef = useRef(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    if (signOutInFlightRef.current || signingOut) {
      return;
    }

    signOutInFlightRef.current = true;
    setSigningOut(true);
    setError(null);

    const result = await runAccountSignOut({
      signingOut: false,
      signOut,
      onSuccess: () => navigate("/auth", { replace: true }),
    });

    if (result === "failed") {
      signOutInFlightRef.current = false;
      setError(accountSignOutFailedMessage);
      setSigningOut(false);
    }
  }

  const session = (
    <HeaderSessionControl
      error={error}
      onSignOut={() => void handleSignOut()}
      signingOut={signingOut}
      user={user}
    />
  );

  return (
    <header className="border-b border-slate-800">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Logo />

        <nav className="hidden sm:block">
          <ul className="flex gap-6 text-slate-300">
            <li>Início</li>
            <li>Recursos</li>
            <li>
              <Link className="transition hover:text-white" to="/planos">
                Planos
              </Link>
            </li>
            <li>{session}</li>
          </ul>
        </nav>

        <div className="sm:hidden">{session}</div>
      </div>
    </header>
  );
}
