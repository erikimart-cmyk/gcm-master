import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

import type { PasswordRecoveryStatus } from "../lib/passwordRecoveryGate";

export type Credentials = {
  email: string;
  password: string;
};

export type SignUpResult = "signed-in" | "confirmation-required";

export type PasswordRecoveryFinishResult = "signed-out" | "sign-out-failed";

export type AuthContextValue = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  configurationError: string | null;
  profileError: string | null;
  passwordRecovery: boolean;
  passwordRecoveryStatus: PasswordRecoveryStatus;
  suppressAuthenticatedBootstrap: boolean;
  signIn: (credentials: Credentials) => Promise<void>;
  signUp: (credentials: Credentials) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePasswordFromRecovery: (password: string) => Promise<void>;
  finishPasswordRecovery: () => Promise<PasswordRecoveryFinishResult>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
