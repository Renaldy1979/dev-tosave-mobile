import { usersMock } from "@/mocks";
import type { Session, User } from "@/types";
import { simulateLatency } from "./_delay";

/**
 * Sessão atual em memória. `null` significa visitante.
 *
 * A fase 2 (backend Appwrite) substitui o estado em memória por
 * `account.createEmailPasswordSession` / `account.deleteSession`.
 * A forma (`Session` com `User | null`) continua a mesma.
 *
 * Exportado para `users.updateProfile` manter a sessão sincronizada
 * após edição do perfil.
 */
export const state: { session: Session } = { session: { user: null } };

/**
 * Senha fixa da fase 1 (ainda em mocks). Na fase 2 o backend valida.
 */
const DEMO_PASSWORD = "tosave123";

/** Erros possíveis de `signIn`. Mapeados dos códigos do Appwrite. */
export type SignInError =
  | "invalid_credentials"
  | "rate_limited"
  | "network"
  | "unknown";

/** Resultado de `signIn`: sucesso traz o usuário, erro traz a mensagem. */
export type SignInResult =
  | { ok: true; user: User }
  | { ok: false; error: SignInError };

/**
 * Login simulado (fase 1 com mocks). Compara e-mail e senha com o
 * usuário de exemplo. Na fase 2 chama
 * `account.createEmailPasswordSession` e mapeia erros.
 */
export async function signIn(email: string, password: string): Promise<SignInResult> {
  await simulateLatency();

  const demo = usersMock[0];
  if (!demo) {
    return { ok: false, error: "unknown" };
  }

  const emailMatch = email.trim().toLowerCase() === demo.email.toLowerCase();
  const passwordMatch = password === DEMO_PASSWORD;

  if (!emailMatch || !passwordMatch) {
    return { ok: false, error: "invalid_credentials" };
  }

  state.session = { user: demo };
  return { ok: true, user: demo };
}

/** Erros possíveis de `signUp`. Mapeados dos códigos do Appwrite. */
export type SignUpError =
  | "email_in_use"
  | "weak_password"
  | "invalid_email"
  | "rate_limited"
  | "network"
  | "unknown";

/** Resultado de `signUp`: sucesso abre sessão, erro traz a mensagem. */
export type SignUpResult =
  | { ok: true; user: User }
  | { ok: false; error: SignUpError };

/**
 * Cadastro simulado (fase 1 com mocks). Cria um novo usuário no
 * `usersMock`, já abre a sessão e devolve o `User` criado.
 *
 * Na fase 2 chama `account.create(ID.unique(), email, password, name)`
 * seguido de `account.createEmailPasswordSession(email, password)`.
 *
 * Senha mínima de 8 caracteres (regra do Appwrite).
 */
export async function signUp(input: {
  name: string;
  email: string;
  password: string;
}): Promise<SignUpResult> {
  await simulateLatency();

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();

  if (name.length < 2) {
    return { ok: false, error: "unknown" };
  }
  if (input.password.length < 8) {
    return { ok: false, error: "weak_password" };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "invalid_email" };
  }

  // Mock: rejeita se já existir o e-mail.
  if (usersMock.some((u) => u.email.toLowerCase() === email)) {
    return { ok: false, error: "email_in_use" };
  }

  const user: User = {
    id: `user-${Date.now().toString(36)}`,
    name,
    email,
    role: "COLLECTOR",
    status: "active",
    expo_push_token: null,
  };
  usersMock.push(user);
  state.session = { user };
  return { ok: true, user };
}

/**
 * Encerra a sessão localmente. Idempotente — chamar com sessão nula
 * não dá erro.
 */
export async function signOut(): Promise<void> {
  await simulateLatency();
  state.session = { user: null };
}

/**
 * Usuário atual ou `null` quando não há sessão. Na fase 2:
 * - 200 → user; 401 → null sem disparar `onUnauthorized` (a splash
 *   usa este caminho).
 */
export async function getCurrentUser(): Promise<User | null> {
  await simulateLatency();
  return state.session.user;
}

/**
 * Sessão completa. Mantida para espelhar a API web.
 */
export async function getSession(): Promise<Session> {
  await simulateLatency();
  return state.session;
}

/**
 * `getDemoCredentials` foi removido na fase 2 — não há mais dados de
 * exemplo no login (a tela mostra "Criar conta" em vez de "Preencher
 * dados de exemplo").
 */
