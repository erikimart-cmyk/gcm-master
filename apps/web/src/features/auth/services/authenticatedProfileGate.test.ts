import { describe, expect, it, vi } from "vitest";

import PendingSubmissionSource from "@/features/study/services/pendingStudySubmission.ts?raw";
import CanonicalStudyRuntimeSource from "@/features/study/runtime/CanonicalStudyRuntime.ts?raw";
import AuthProviderSource from "../context/AuthProvider.tsx?raw";
import RequireAuthSource from "../components/RequireAuth.tsx?raw";
import {
  createAuthenticatedProfileGate,
  profileGuaranteeFailureMessage,
} from "./authenticatedProfileGate";

function deferred() {
  let resolve: () => void = () => {};
  let reject: (error: unknown) => void = () => {};
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe("authenticated profile gate", () => {
  it("garante o profile uma vez no primeiro acesso autenticado", async () => {
    const userId = "user-a";
    const ensure = vi.fn(async () => {});
    const gate = createAuthenticatedProfileGate(ensure);

    await gate.apply(userId);

    expect(ensure).toHaveBeenCalledTimes(1);
    expect(ensure).toHaveBeenCalledWith(userId);
    expect(gate.snapshot()).toEqual({
      userId,
      status: "ready",
      failureMessage: null,
    });
  });

  it("não escreve quando não há usuário autenticado", async () => {
    const ensure = vi.fn(async () => {});
    const gate = createAuthenticatedProfileGate(ensure);

    await gate.apply(null);
    await gate.apply("");

    expect(ensure).not.toHaveBeenCalled();
    expect(gate.snapshot()).toEqual({
      userId: null,
      status: "idle",
      failureMessage: null,
    });
  });

  it("não repete a escrita depois que o profile está pronto", async () => {
    const ensure = vi.fn(async () => {});
    const gate = createAuthenticatedProfileGate(ensure);

    await gate.apply("user-a");
    await gate.apply("user-a");
    await gate.apply("user-a");

    expect(ensure).toHaveBeenCalledTimes(1);
    expect(gate.snapshot().status).toBe("ready");
  });

  it("eventos repetidos compartilham a mesma garantia e não falham a sessão", async () => {
    const pending = deferred();
    const ensure = vi.fn(() => pending.promise);
    const gate = createAuthenticatedProfileGate(ensure);

    const first = gate.apply("user-a");
    const second = gate.apply("user-a");

    expect(gate.snapshot().status).toBe("pending");
    expect(ensure).toHaveBeenCalledTimes(1);

    pending.resolve();
    await first;
    await second;

    expect(gate.snapshot()).toEqual({
      userId: "user-a",
      status: "ready",
      failureMessage: null,
    });
  });

  it("um conflito tratado pela garantia não deixa a sessão em erro", async () => {
    const ensure = vi.fn(async () => {});
    const gate = createAuthenticatedProfileGate(ensure);

    await gate.apply("user-a");
    await gate.apply("user-a");

    expect(gate.snapshot().failureMessage).toBeNull();
    expect(gate.snapshot().status).toBe("ready");
  });

  it("mostra falha estrutural uma única vez, sem nova escrita e sem encerrar a sessão", async () => {
    const ensure = vi.fn(async () => {
      throw new Error("permission denied for table profiles");
    });
    const gate = createAuthenticatedProfileGate(ensure);

    await expect(gate.apply("user-a")).resolves.toBeUndefined();
    await gate.apply("user-a");

    expect(ensure).toHaveBeenCalledTimes(1);
    expect(gate.snapshot()).toEqual({
      userId: "user-a",
      status: "failed",
      failureMessage: profileGuaranteeFailureMessage,
    });
  });

  it("não cria profile para outro usuário", async () => {
    const ensure = vi.fn(async () => {});
    const gate = createAuthenticatedProfileGate(ensure);

    await gate.apply("user-a");

    expect(ensure.mock.calls).toEqual([["user-a"]]);
  });

  it("troca de usuário garante somente o usuário da sessão atual", async () => {
    const ensure = vi.fn(async () => {});
    const gate = createAuthenticatedProfileGate(ensure);

    await gate.apply("user-a");
    await gate.apply("user-b");

    expect(ensure.mock.calls).toEqual([["user-a"], ["user-b"]]);
    expect(gate.snapshot().userId).toBe("user-b");
  });

  it("logout limpa a pendência e permite uma nova garantia no próximo acesso", async () => {
    const ensure = vi.fn(async () => {});
    const gate = createAuthenticatedProfileGate(ensure);

    await gate.apply("user-a");
    await gate.apply(null);

    expect(gate.snapshot()).toEqual({
      userId: null,
      status: "idle",
      failureMessage: null,
    });

    await gate.apply("user-a");
    expect(ensure).toHaveBeenCalledTimes(2);
  });

  it("acontece na sessão autenticada e não no estudo nem no envio pendente", () => {
    expect(AuthProviderSource).toContain("createAuthenticatedProfileGate");
    expect(AuthProviderSource).toContain("profileGate.apply");
    expect(RequireAuthSource).toContain("profileError");
    expect(CanonicalStudyRuntimeSource).not.toContain("ensureOwnProfile");
    expect(CanonicalStudyRuntimeSource).not.toContain("profiles");
    expect(PendingSubmissionSource).not.toContain("profiles");
  });

  it("logout durante uma garantia não transforma o resultado atrasado em erro de sessão", async () => {
    const pending = deferred();
    const ensure = vi.fn(() => pending.promise);
    const gate = createAuthenticatedProfileGate(ensure);

    const attempt = gate.apply("user-a");
    await gate.apply(null);
    pending.reject(new Error("late failure"));
    await attempt;

    expect(gate.snapshot()).toEqual({
      userId: null,
      status: "idle",
      failureMessage: null,
    });
  });
});
