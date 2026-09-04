import { createContext } from "react";
import type { Session, User } from "@supabase/supabase-js";

export type Credentials = {
  email: string;
  password: string;
};

export type SignUpResult = "signed-in" | "confirmation-required";

export type AuthContextValue = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  configurationError: string | null;
  signIn: (credentials: Credentials) => Promise<void>;
  signUp: (credentials: Credentials) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
