import { usersMock } from "@/mocks";
import type { Session, User } from "@/types";
import { simulateLatency } from "./_delay";

/**
 * Sessão atual em memória. `null` significa visitante.
 * A fase 2 troca para armazenamento persistente (SecureStore/AsyncStorage)
 * e valida a senha em servidor — a forma (`Session` com `User | null`)
 * continua a mesma.
 */
const state: { session: Session } = { session: { user: null } };

/** Resultado de `signIn`: sucesso traz o usuário, erro traz a mensagem. */
export type SignInResult =
  | { ok: true; user: User }
  | { ok: false; error: "invalid_credentials" | "unknown" };

/**
 * Login simulado. Compara e-mail e senha com o usuário de exemplo dos
 * mocks. Não existe cadastro nem validação real — sai na fase 2.
 */
export async function signIn(email: string, password: string): Promise<SignInResult> {
  await simulateLatency();

  const demo = usersMock[0];
  if (!demo) {
    return { ok: false, error: "unknown" };
  }

  const emailMatch = email.trim().toLowerCase() === demo.email.toLowerCase();
  // Senha fixa da fase 1 — combinar com `getDemoCredentials()`.
  const passwordMatch = password === "tosave123";

  if (!emailMatch || !passwordMatch) {
    return { ok: false, error: "invalid_credentials" };
  }

  state.session = { user: demo };
  return { ok: true, user: demo };
}

/**
 * Encerra a sessão localmente. Idempotente — chamar com sessão nula
 * não dá erro (usado pelo fluxo "Sair" da fase 2).
 */
export async function signOut(): Promise<void> {
  await simulateLatency();
  state.session = { user: null };
}

/** Usuário atual ou `null` quando não há sessão. */
export async function getCurrentUser(): Promise<User | null> {
  await simulateLatency();
  return state.session.user;
}

/**
 * Sessão completa (caso algum caller prefira ler `user` direto).
 * Mantida para espelhar a API web (que pode devolver outros campos
 * junto do usuário, como tokens).
 */
export async function getSession(): Promise<Session> {
  await simulateLatency();
  return state.session;
}

/**
 * Credenciais de exemplo expostas para o link "Preencher dados de
 * exemplo" do login (docs/02-login.md §5). A tela chama isto em vez
 * de importar o mock diretamente.
 */
export async function getDemoCredentials(): Promise<{ email: string; password: string }> {
  // Sem latência — preenchimento local, não simula request.
  return { email: "demo@tosave.app", password: "tosave123" };
}
