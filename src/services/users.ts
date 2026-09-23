import { usersMock } from "@/mocks";
import type { User } from "@/types";
import { simulateLatency } from "./_delay";
import { state as authState } from "./auth";

/**
 * `users.updateProfile({ name, email })` da spec de dados (README.md).
 *
 * Atualiza o usuário em memória (a fase 2 persiste no portal web) e
 * mantém a sessão sincronizada. Validação leve é feita no service;
 * a tela exibe mensagens mais ricas.
 *
 * Não toca em `role`, `status` ou `expo_push_token` — esses são
 * responsabilidade do portal.
 */
export interface UpdateProfileInput {
  name: string;
  email: string;
}

export type UpdateProfileResult =
  | { ok: true; user: User }
  | { ok: false; error: "email_in_use" | "unknown" };

export async function updateProfile(
  input: UpdateProfileInput
): Promise<UpdateProfileResult> {
  await simulateLatency();
  const trimmedName = input.name.trim();
  const trimmedEmail = input.email.trim().toLowerCase();
  if (trimmedName.length < 2 || trimmedName.length > 60) {
    return { ok: false, error: "unknown" };
  }
  // "email_in_use" só seria usado se houvesse outro usuário — neste
  // mock há um único usuário, então o erro cai em `unknown` em outros
  // casos. Mantemos o discriminador para alinhar com a fase 2.
  const current = authState.session.user;
  if (!current) {
    return { ok: false, error: "unknown" };
  }
  const idx = usersMock.findIndex((u) => u.id === current.id);
  if (idx < 0) return { ok: false, error: "unknown" };
  const updated: User = {
    ...usersMock[idx],
    name: trimmedName,
    email: trimmedEmail,
  };
  usersMock[idx] = updated;
  authState.session = { user: updated };
  return { ok: true, user: updated };
}
