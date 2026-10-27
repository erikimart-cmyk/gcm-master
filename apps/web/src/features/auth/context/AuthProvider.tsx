import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";

import {
  classifyPasswordUpdateError,
  isValidEmail,
} from "../lib/passwordRecoveryActions";
import {
  createPasswordRecoveryGate,
  shouldSuppressAuthenticatedBootstrap,
  type PasswordRecoveryStatus,
} from "../lib/passwordRecoveryGate";
import {
  isPasswordRecoveryPath,
  readConfiguredRecoveryOrigin,
  recoveryOriginUnsafeMessage,
  resolvePasswordRecoveryRedirect,
} from "../lib/passwordRecoveryRedirect";
import {
  getSupabaseClient,
  supabaseConfigurationMessage,
} from "../lib/supabase";
import { createAuthenticatedProfileGate } from "../services/authenticatedProfileGate";
import {
  AuthContext,
  type AuthContextValue,
  type Credentials,
  type PasswordRecoveryFinishResult,
  type SignUpResult,
} from "./auth-context";

const supabase = getSupabaseClient();

function currentPathname() {
  return globalThis.location?.pathname ?? "";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(supabase));
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const initialPathname = currentPathname();
  const recoveryRef = useRef(createPasswordRecoveryGate(initialPathname));
  const [passwordRecoveryStatus, setPasswordRecoveryStatus] = useState<PasswordRecoveryStatus>(() =>
    isPasswordRecoveryPath(initialPathname) ? "path-isolated" : "idle",
  );

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isActive = true;
    const profileGate = createAuthenticatedProfileGate();

    const publishRecovery = () => {
      if (!isActive) {
        return;
      }

      setPasswordRecoveryStatus(recoveryRef.current.snapshot());
    };

    const publishProfile = () => {
      if (!isActive) {
        return;
      }

      const snapshot = profileGate.snapshot();
      setProfileError(snapshot.failureMessage);
      setIsLoading(snapshot.status === "pending");
    };

    const skipProfileForRecovery = (pathname: string) =>
      shouldSuppressAuthenticatedBootstrap(recoveryRef.current.snapshot(), pathname);

    const applyProfileIfAllowed = (nextUserId: string | null, pathname: string) => {
      if (skipProfileForRecovery(pathname)) {
        setProfileError(null);
        setIsLoading(false);
        return Promise.resolve();
      }

      const snapshot = profileGate.snapshot();

      if (snapshot.userId === nextUserId && snapshot.status === "ready") {
        setProfileError(null);
        setIsLoading(false);
        return Promise.resolve();
      }

      if (snapshot.userId === nextUserId && snapshot.status === "failed") {
        setProfileError(snapshot.failureMessage);
        setIsLoading(false);
        return Promise.resolve();
      }

      if (nextUserId) {
        setIsLoading(true);
      }

      return profileGate.apply(nextUserId).then(() => {
        publishProfile();
      });
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isActive) {
        return;
      }

      const pathname = currentPathname();
      setSessionError(null);
      setSession(nextSession);
      recoveryRef.current.handleEvent(event, pathname);
      publishRecovery();
      void applyProfileIfAllowed(nextSession?.user.id ?? null, pathname);
    });

    void supabase.auth.getSession().then(async ({ data, error }) => {
      if (!isActive) {
        return;
      }

      const pathname = currentPathname();

      if (error) {
        setSessionError("Não foi possível verificar sua sessão. Tente novamente.");
      }

      setSession(data.session);
      recoveryRef.current.handleEvent("INITIAL_SESSION", pathname);
      await Promise.resolve();
      recoveryRef.current.finalizeInitialSession(pathname, Boolean(data.session));
      publishRecovery();
      await applyProfileIfAllowed(data.session?.user.id ?? null, pathname);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  const suppressAuthenticatedBootstrap = shouldSuppressAuthenticatedBootstrap(
    passwordRecoveryStatus,
    currentPathname(),
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      session,
      isLoading,
      configurationError: supabase ? sessionError : supabaseConfigurationMessage,
      profileError,
      passwordRecovery: passwordRecoveryStatus === "authorized",
      passwordRecoveryStatus,
      suppressAuthenticatedBootstrap,
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
      async requestPasswordReset(email: string) {
        if (!supabase) {
          throw new Error(supabaseConfigurationMessage);
        }

        if (!isValidEmail(email)) {
          throw new Error("Informe um e-mail válido.");
        }

        const redirectTo = resolvePasswordRecoveryRedirect(readConfiguredRecoveryOrigin());

        if (!redirectTo) {
          throw new Error(recoveryOriginUnsafeMessage);
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo,
        });

        if (error) {
          throw error;
        }
      },
      async updatePasswordFromRecovery(password: string) {
        if (!supabase) {
          throw new Error(supabaseConfigurationMessage);
        }

        if (!recoveryRef.current.canUpdatePassword()) {
          throw new Error(classifyPasswordUpdateError(new Error("session")));
        }

        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
          recoveryRef.current.block();
          setPasswordRecoveryStatus(recoveryRef.current.snapshot());
          throw new Error(classifyPasswordUpdateError(error));
        }
      },
      async finishPasswordRecovery(): Promise<PasswordRecoveryFinishResult> {
        recoveryRef.current.consume();
        setPasswordRecoveryStatus(recoveryRef.current.snapshot());

        if (!supabase) {
          return "sign-out-failed";
        }

        const { error } = await supabase.auth.signOut();

        if (error) {
          return "sign-out-failed";
        }

        recoveryRef.current.invalidate();
        setPasswordRecoveryStatus(recoveryRef.current.snapshot());
        return "signed-out";
      },
    }),
    [
      isLoading,
      passwordRecoveryStatus,
      profileError,
      session,
      sessionError,
      suppressAuthenticatedBootstrap,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
