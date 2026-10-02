import { beforeEach, describe, expect, it, vi } from "vitest";

const supabase = vi.hoisted(() => ({
  getClient: vi.fn(),
}));

vi.mock("../lib/supabase", () => ({
  getSupabaseClient: supabase.getClient,
}));

import {
  ensureOwnProfile,
  guaranteeAuthenticatedProfile,
} from "./ProfileRepository";

type ProfileRow = {
  id: string;
  display_name: string | null;
  updated_at: string;
};

type UpsertCall = {
  table: string;
  payload: Record<string, unknown>;
  options: Record<string, unknown>;
};

function installProfiles(options?: {
  upsertError?: { code: string; message: string } | null;
  readError?: { message: string } | null;
  deferUpsert?: boolean;
}) {
  const rows = new Map<string, ProfileRow>();
  const calls: UpsertCall[] = [];
  let releaseUpsert: ((result: { error: { code: string; message: string } | null }) => void) | null =
    null;
  const upsertGate = options?.deferUpsert
    ? new Promise<{ error: { code: string; message: string } | null }>((resolve) => {
        releaseUpsert = resolve;
      })
    : null;

  const from = vi.fn((table: string) => {
    let requestedId = "";

    return {
      upsert: vi.fn((payload: Record<string, unknown>, upsertOptions: Record<string, unknown>) => {
        calls.push({ table, payload, options: upsertOptions });

        const finish = (error: { code: string; message: string } | null) => {
          if (!error) {
            const id = String(payload.id);
            if (!rows.has(id)) {
              rows.set(id, {
                id,
                display_name: Object.prototype.hasOwnProperty.call(payload, "display_name")
                  ? (payload.display_name as string | null)
                  : null,
                updated_at: "created",
              });
            } else if (upsertOptions.ignoreDuplicates !== true) {
              const existing = rows.get(id);
              if (existing) {
                existing.display_name = Object.prototype.hasOwnProperty.call(payload, "display_name")
                  ? (payload.display_name as string | null)
                  : existing.display_name;
                existing.updated_at = "updated";
              }
            }
          }

          return { error };
        };

        if (upsertGate && releaseUpsert) {
          return upsertGate.then((result) => finish(result.error));
        }

        return Promise.resolve(finish(options?.upsertError ?? null));
      }),
      select: vi.fn(() => ({
        eq: vi.fn((_column: string, value: string) => {
          requestedId = value;
          return {
            maybeSingle: vi.fn(() => {
              if (options?.readError) {
                return Promise.resolve({ data: null, error: options.readError });
              }

              const row = rows.get(requestedId);
              return Promise.resolve({
                data: row ? { id: row.id } : null,
                error: null,
              });
            }),
          };
        }),
      })),
    };
  });

  supabase.getClient.mockReturnValue({ from });

  return { rows, calls, from, releaseUpsert: (error: { code: string; message: string } | null) => releaseUpsert?.( { error }) };
}

describe("guaranteeAuthenticatedProfile", () => {
  beforeEach(() => {
    supabase.getClient.mockReset();
  });

  it("não escreve em profiles sem usuário autenticado", async () => {
    await guaranteeAuthenticatedProfile(null);
    await guaranteeAuthenticatedProfile("");

    expect(supabase.getClient).not.toHaveBeenCalled();
  });

  it("garante a linha mínima do próprio usuário sem fabricar display_name", async () => {
    const userId = "11111111-1111-4111-8111-111111111111";
    const store = installProfiles();

    await guaranteeAuthenticatedProfile(userId);

    expect(store.calls).toEqual([
      {
        table: "profiles",
        payload: { id: userId },
        options: { onConflict: "id", ignoreDuplicates: true },
      },
    ]);
    expect(store.rows.get(userId)).toEqual({
      id: userId,
      display_name: null,
      updated_at: "created",
    });
    expect(store.from).toHaveBeenCalledTimes(1);
    expect(store.from).toHaveBeenCalledWith("profiles");
  });

  it("preserva display_name e os demais campos de um profile existente", async () => {
    const userId = "22222222-2222-4222-8222-222222222222";
    const store = installProfiles();
    store.rows.set(userId, {
      id: userId,
      display_name: "Aluno existente",
      updated_at: "original",
    });

    await ensureOwnProfile(userId);
    await ensureOwnProfile(userId);

    expect(store.calls).toHaveLength(2);
    expect(store.calls.every((call) => call.payload)).toBe(true);
    for (const call of store.calls) {
      expect(call.payload).toEqual({ id: userId });
      expect(call.payload).not.toHaveProperty("display_name");
      expect(call.options).toEqual({ onConflict: "id", ignoreDuplicates: true });
    }
    expect(store.rows.get(userId)).toEqual({
      id: userId,
      display_name: "Aluno existente",
      updated_at: "original",
    });
    expect(store.rows.size).toBe(1);
  });

  it("trata conflito de unicidade como sucesso e não duplica a linha", async () => {
    const userId = "33333333-3333-4333-8333-333333333333";
    const store = installProfiles({
      upsertError: { code: "23505", message: "duplicate key value violates unique constraint" },
    });
    store.rows.set(userId, {
      id: userId,
      display_name: "Já criado",
      updated_at: "original",
    });

    await expect(ensureOwnProfile(userId)).resolves.toBeUndefined();
    await expect(ensureOwnProfile(userId)).resolves.toBeUndefined();

    expect(store.rows.size).toBe(1);
    expect(store.rows.get(userId)?.display_name).toBe("Já criado");
    expect(store.from.mock.calls.every((call) => call[0] === "profiles")).toBe(true);
  });

  it("compartilha garantias concorrentes do mesmo usuário em uma única escrita", async () => {
    const userId = "44444444-4444-4444-8444-444444444444";
    const store = installProfiles({ deferUpsert: true });

    const first = ensureOwnProfile(userId);
    const second = ensureOwnProfile(userId);

    expect(store.calls).toHaveLength(1);
    expect(store.calls[0]?.payload).toEqual({ id: userId });

    store.releaseUpsert(null);
    await expect(first).resolves.toBeUndefined();
    await expect(second).resolves.toBeUndefined();
    expect(store.rows.size).toBe(1);
    expect(store.calls).toHaveLength(1);
  });

  it("não transforma um conflito concorrente em falha quando a escrita já foi iniciada", async () => {
    const userId = "55555555-5555-4555-8555-555555555555";
    const store = installProfiles({ deferUpsert: true });

    const first = ensureOwnProfile(userId);
    const second = ensureOwnProfile(userId);
    store.releaseUpsert({
      code: "23505",
      message: "duplicate key value violates unique constraint",
    });

    await expect(first).resolves.toBeUndefined();
    await expect(second).resolves.toBeUndefined();
    expect(store.calls).toHaveLength(1);
    expect(store.calls[0]?.payload).toEqual({ id: userId });
  });

  it("só escreve o id do usuário recebido", async () => {
    const authenticatedUserId = "66666666-6666-4666-8666-666666666666";
    const otherUserId = "77777777-7777-4777-8777-777777777777";
    const store = installProfiles();

    await ensureOwnProfile(authenticatedUserId);

    expect(store.calls).toHaveLength(1);
    expect(store.calls[0]?.payload).toEqual({ id: authenticatedUserId });
    expect(JSON.stringify(store.calls)).not.toContain(otherUserId);
    expect(store.rows.has(otherUserId)).toBe(false);
  });

  it("expõe falha estrutural quando o profile não existe", async () => {
    const userId = "88888888-8888-4888-8888-888888888888";
    const failure = { code: "42501", message: "permission denied for table profiles" };
    installProfiles({ upsertError: failure });

    await expect(ensureOwnProfile(userId)).rejects.toMatchObject(failure);
  });

  it("não derruba quem já tem profile quando a escrita redundante falha", async () => {
    const userId = "99999999-9999-4999-8999-999999999999";
    const store = installProfiles({
      upsertError: { code: "08006", message: "connection failure" },
    });
    store.rows.set(userId, {
      id: userId,
      display_name: "Preservado",
      updated_at: "original",
    });

    await expect(ensureOwnProfile(userId)).resolves.toBeUndefined();
    expect(store.rows.get(userId)).toEqual({
      id: userId,
      display_name: "Preservado",
      updated_at: "original",
    });
  });

  it("não finge que o profile existe quando a leitura de confirmação também falha", async () => {
    const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const failure = { code: "42501", message: "permission denied for table profiles" };
    installProfiles({
      upsertError: failure,
      readError: { message: "could not read profiles" },
    });

    await expect(ensureOwnProfile(userId)).rejects.toMatchObject(failure);
  });
});
