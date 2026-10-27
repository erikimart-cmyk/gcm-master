import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/useAuth";
import {
  accountSignOutFailedMessage,
  runAccountSignOut,
} from "../lib/accountSessionActions";

export type AccountSessionControlViewProps = {
  open: boolean;
  signingOut: boolean;
  error: string | null;
  menuId: string;
  onToggle: () => void;
  onSignOut: () => void;
  onClose: () => void;
};

export function AccountSessionControlView({
  open,
  signingOut,
  error,
  menuId,
  onToggle,
  onSignOut,
  onClose,
}: AccountSessionControlViewProps) {
  return (
    <div className="absolute top-4 right-4 z-20 sm:top-6 sm:right-6">
      <div className="relative flex flex-col items-end">
        <button
          aria-controls={menuId}
          aria-expanded={open}
          aria-haspopup="menu"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-violet-500/30 bg-zinc-950 px-3 py-2 text-sm font-medium text-violet-100 transition hover:border-violet-400/60 hover:bg-violet-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
          disabled={signingOut}
          onClick={onToggle}
          type="button"
        >
          <span
            aria-hidden="true"
            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/20 text-violet-200"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-3.3 0-8 1.7-8 5v1h16v-1c0-3.3-4.7-5-8-5Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <span>Minha conta</span>
          <span aria-hidden="true" className={`text-xs text-violet-300 transition ${open ? "rotate-180" : ""}`}>
            ▾
          </span>
        </button>

        {open ? (
          <div
            className="mt-2 w-48 rounded-xl border border-zinc-800 bg-zinc-950 p-1 shadow-2xl shadow-black/40"
            id={menuId}
            role="menu"
          >
            <button
              className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-zinc-100 transition hover:bg-violet-500/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 disabled:cursor-not-allowed disabled:text-zinc-500"
              disabled={signingOut}
              onClick={onSignOut}
              role="menuitem"
              type="button"
            >
              {signingOut ? "Saindo…" : "Sair da conta"}
            </button>
          </div>
        ) : null}

        {error ? (
          <p className="mt-2 max-w-[16rem] rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-left text-sm text-red-100" role="alert">
            {error}
          </p>
        ) : null}

        {open ? (
          <button
            aria-label="Fechar menu da conta"
            className="sr-only"
            onClick={onClose}
            type="button"
          >
            Fechar
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function AccountSessionControl() {
  const { isLoading, signOut, user } = useAuth();
  const navigate = useNavigate();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const signOutInFlightRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open]);

  if (isLoading || !user) {
    return null;
  }

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

  return (
    <div ref={rootRef}>
      <AccountSessionControlView
        error={error}
        menuId={menuId}
        onClose={() => setOpen(false)}
        onSignOut={() => void handleSignOut()}
        onToggle={() => setOpen((current) => !current)}
        open={open}
        signingOut={signingOut}
      />
    </div>
  );
}
