import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";

import {
  getSupabaseClient,
  supabaseConfigurationMessage,
} from "../lib/supabase";
import { createAuthenticatedProfileGate } from "../services/authenticatedProfileGate";
import {
  AuthContext,
  type AuthContextValue,
  type Credentials,
  type SignUpResult,
} from "./auth-context";

const supabase = getSupabaseClient();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(supabase));
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isActive = true;
    const profileGate = createAuthenticatedProfileGate();

    const publishProfile = () => {
      if (!isActive) {
        return;
      }

      const snapshot = profileGate.snapshot();
      setProfileError(snapshot.failureMessage);
      setIsLoading(snapshot.status === "pending");
    };

    void supabase.auth.getSession().then(async ({ data, error }) => {
      if (!isActive) {
        return;
      }

      if (error) {
        setSessionError("Não foi possível verificar sua sessão. Tente novamente.");
      }

      setSession(data.session);
      await profileGate.apply(data.session?.user.id ?? null);
      publishProfile();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSessionError(null);
      setSession(nextSession);

      const nextUserId = nextSession?.user.id ?? null;
      const snapshot = profileGate.snapshot();

      if (snapshot.userId === nextUserId && snapshot.status === "ready") {
        setProfileError(null);
        setIsLoading(false);
        return;
      }

      if (snapshot.userId === nextUserId && snapshot.status === "failed") {
        setProfileError(snapshot.failureMessage);
        setIsLoading(false);
        return;
      }

      if (nextUserId) {
        setIsLoading(true);
      }

      void profileGate.apply(nextUserId).then(() => {
        publishProfile();
      });
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      isLoading,
      configurationError: supabase ? sessionError : supabaseConfigurationMessage,
      profileError,
      async signIn({ email, password }: Credentials) {
        if (!supabase) {
          throw new Error(supabaseConfigurationMessage);
        }

        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }
      },
      async signUp({ email, password }: Credentials): Promise<SignUpResult> {
        if (!supabase) {
          throw new Error(supabaseConfigurationMessage);
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
          },
        });

        if (error) {
          throw error;
        }

        return data.session ? "signed-in" : "confirmation-required";
      },
      async signOut() {
        if (!supabase) {
          return;
        }

        const { error } = await supabase.auth.signOut();

        if (error) {
          throw error;
        }
      },
    }),
    [isLoading, profileError, session, sessionError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
