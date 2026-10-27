export const accountSignOutFailedMessage =
  "Não foi possível encerrar a sessão. Tente novamente.";

export async function runAccountSignOut(input: {
  signingOut: boolean;
  signOut: () => Promise<void>;
  onSuccess: () => void;
}): Promise<"ignored" | "signed-out" | "failed"> {
  if (input.signingOut) {
    return "ignored";
  }

  try {
    await input.signOut();
    input.onSuccess();
    return "signed-out";
  } catch {
    return "failed";
  }
}
