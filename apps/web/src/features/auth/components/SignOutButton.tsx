import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/useAuth";
import {
  accountSignOutFailedMessage,
  runAccountSignOut,
} from "../lib/accountSessionActions";

export function SignOutButton() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const signOutInFlightRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return null;
  }

  async function handleSignOut() {
    if (signOutInFlightRef.current || isSubmitting) {
      return;
    }

    signOutInFlightRef.current = true;
    setIsSubmitting(true);
    setError(null);

    const result = await runAccountSignOut({
      signingOut: false,
      signOut,
      onSuccess: () => navigate("/auth", { replace: true }),
    });

    if (result === "failed") {
      signOutInFlightRef.current = false;
      setIsSubmitting(false);
      setError(accountSignOutFailedMessage);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        aria-busy={isSubmitting}
        className="rounded-full border border-zinc-800 bg-zinc-950/80 px-4 py-2 text-sm font-medium text-zinc-400 transition hover:border-zinc-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        onClick={handleSignOut}
        type="button"
      >
        {isSubmitting ? "Saindo…" : "Sair"}
      </button>
      {error ? (
        <p className="max-w-xs text-right text-xs text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
