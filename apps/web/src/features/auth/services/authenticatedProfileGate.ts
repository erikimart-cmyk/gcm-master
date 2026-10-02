import { guaranteeAuthenticatedProfile } from "../repositories/ProfileRepository";

export const profileGuaranteeFailureMessage =
  "Não foi possível preparar seu perfil. Recarregue a página para tentar de novo.";

export type AuthenticatedProfileStatus = "idle" | "pending" | "ready" | "failed";

export type AuthenticatedProfileSnapshot = {
  userId: string | null;
  status: AuthenticatedProfileStatus;
  failureMessage: string | null;
};

export function createAuthenticatedProfileGate(
  ensureOwnProfile: (userId: string) => Promise<void> = guaranteeAuthenticatedProfile,
) {
  let generation = 0;
  let snapshot: AuthenticatedProfileSnapshot = {
    userId: null,
    status: "idle",
    failureMessage: null,
  };
  let pending: Promise<void> | null = null;

  return {
    snapshot(): AuthenticatedProfileSnapshot {
      return snapshot;
    },
    apply(nextUserId: string | null): Promise<void> {
      if (!nextUserId) {
        generation += 1;
        snapshot = { userId: null, status: "idle", failureMessage: null };
        pending = null;
        return Promise.resolve();
      }

      if (
        snapshot.userId === nextUserId &&
        (snapshot.status === "ready" || snapshot.status === "failed")
      ) {
        return Promise.resolve();
      }

      if (snapshot.userId === nextUserId && snapshot.status === "pending" && pending) {
        return pending;
      }

      const runGeneration = generation + 1;
      generation = runGeneration;
      snapshot = {
        userId: nextUserId,
        status: "pending",
        failureMessage: null,
      };

      const run = ensureOwnProfile(nextUserId).then(
        () => {
          if (generation !== runGeneration) {
            return;
          }

          snapshot = {
            userId: nextUserId,
            status: "ready",
            failureMessage: null,
          };
        },
        () => {
          if (generation !== runGeneration) {
            return;
          }

          snapshot = {
            userId: nextUserId,
            status: "failed",
            failureMessage: profileGuaranteeFailureMessage,
          };
        },
      );

      pending = run;
      return run;
    },
  };
}
