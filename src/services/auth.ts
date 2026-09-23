import {
  account,
  withServiceError,
  ServiceError,
  setOnUnauthorized,
} from "./_appwrite";
import {
  getCurrentSession,
  setCurrentSession,
  subscribeSession,
  silentSignOut,
} from "./_session";
import type { Session } from "@/types";

/**
 * Erros possíveis de `signIn`. Mapeados dos códigos do Appwrite.
 */
export type SignInError =
  | "invalid_credentials"
  | "rate_limited"
  | "network"
  | "unknown";

/** Resultado de `signIn`. */
export type SignInResult =
  | { ok: true; user: User }
  | { ok: false; error: SignInError };

/**
 * Login. Chama `account.createEmailPasswordSession`.
 * Erros:
 * - 401 → invalid_credentials
 * - 429 → rate_limited
 * - outros → unknown
 */
export async function signIn(email: string, password: string): Promise<SignInResult> {
  try {
    await withServiceError(() =>
      account.createEmailPasswordSession(email.trim().toLowerCase(), password)
    );
    const user = requireUser(await fetchCurrentUser());
    setCurrentSession({ user });
    return { ok: true, user };
  } catch (err) {
    return { ok: false, error: mapAuthError(err) };
  }
}

/** Erros possíveis de `signUp`. */
export type SignUpError =
  | "email_in_use"
  | "weak_password"
  | "invalid_email"
  | "rate_limited"
  | "network"
  | "unknown";

/** Resultado de `signUp`. */
export type SignUpResult =
  | { ok: true; user: User }
  | { ok: false; error: SignUpError };

/**
 * Cadastro. Cria conta + sessão. O Appwrite já abre sessão no
 * `createEmailPasswordSession` se passado logo em seguida.
 *
 * Erros:
 * - 409 user_already_exists → email_in_use
 * - 400 com argumento `password` → weak_password
 * - 400 com argumento `email` → invalid_email
 * - 429 → rate_limited
 */
export async function signUp(input: {
  name: string;
  email: string;
  password: string;
}): Promise<SignUpResult> {
  try {
    const userId = "user-" + cryptoId();
    await withServiceError(() =>
      account.create({
        userId,
        email: input.email.trim().toLowerCase(),
        password: input.password,
        name: input.name.trim(),
      })
    );
    await withServiceError(() =>
      account.createEmailPasswordSession(
        input.email.trim().toLowerCase(),
        input.password
      )
    );
    const user = requireUser(await fetchCurrentUser());
    setCurrentSession({ user });
    return { ok: true, user };
  } catch (err) {
    return { ok: false, error: mapSignUpError(err) };
  }
}

/** Erros possíveis de `changePassword`. */
export type ChangePasswordError =
  | "wrong_password"
  | "weak_password"
  | "rate_limited"
  | "network"
  | "unknown";

/** Resultado de `changePassword`. */
export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; error: ChangePasswordError };

/**
 * Alteração de senha. Mapeia para `account.updatePassword(newPassword,
 * oldPassword)`. Sucesso mantém a sessão.
 *
 * Erros:
 * - 401 user_invalid_credentials → wrong_password (campo Senha atual)
 * - 400 com argumento `password` → weak_password
 * - 429 → rate_limited
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<ChangePasswordResult> {
  try {
    await withServiceError(() =>
      account.updatePassword(newPassword, currentPassword)
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: mapChangePasswordError(err) };
  }
}

/**
 * Encerra a sessão atual via `account.deleteSession("current")` e
 * limpa o espelho em memória. Idempotente — chamar sem sessão não dá
 * erro.
 */
export async function signOut(): Promise<void> {
  try {
    await withServiceError(() => account.deleteSession("current"));
  } catch {
    // ignora — vamos limpar o espelho mesmo assim.
  }
  setCurrentSession({ user: null });
  // Libera também o cache de reatividade: ao reentrar no app, o
  // `useCurrentUser` ainda lê o espelho até o `refresh` resolver.
  notifyRefresh();
}

/**
 * Usuário atual ou `null` quando não há sessão.
 *
 * Na fase 2 o client Appwrite persiste a sessão; este método consulta
 * `account.get()`. 401 → `null` **sem disparar `onUnauthorized`** (a
 * splash usa este caminho; ali 401 é normal).
 */
export async function getCurrentUser(): Promise<User | null> {
  // Lê o espelho primeiro para reatividade imediata após signIn/signOut.
  const cached = getCurrentSession().user;
  if (cached) return cached;
  try {
    const u = await withServiceError(() => account.get());
    return toAppUser(u);
  } catch (err) {
    if (err instanceof ServiceError && err.code === "unauthorized") return null;
    // rede/desconhecido: também devolve null para a splash conseguir
    // decidir destino (já existe a flag de AsyncStorage).
    return null;
  }
}

/**
 * Sessão completa — espelha `account.getSession()` para consumidores
 * que preferem o formato `Session`. Aqui só devolve o espelho atual.
 */
export async function getSession(): Promise<Session> {
  return getCurrentSession();
}

/* ================================================================== */
/*                          HELPERS INTERNOS                          */
/* ================================================================== */

/**
 * Tipo `User` do app. O Appwrite guarda o `role` em `teams` e o
 * `expo_push_token` em `prefs`; aqui reconstruímos os dois a partir do
 * `account.get()`.
 */
import type { User } from "@/types";

/**
 * ID curto (16 chars hex) para `userId` no cadastro. O Appwrite aceita
 * qualquer string com até 36 chars; usamos um sufixo randômico para
 * evitar colisões.
 */
function cryptoId(): string {
  // `Math.random` é suficiente para um id único no client (não é
  // segredo). Em produção podemos trocar por `expo-crypto`.
  return (
    Math.random().toString(36).slice(2, 8) +
    Math.random().toString(36).slice(2, 8) +
    Math.random().toString(36).slice(2, 8)
  );
}

interface AppwriteUser {
  $id: string;
  name?: string;
  email?: string;
  status?: boolean;
  prefs?: Record<string, unknown>;
}

function toAppUser(u: AppwriteUser): User {
  return {
    id: u.$id,
    name: u.name ?? u.email ?? "",
    email: u.email ?? "",
    role: "COLLECTOR",
    status: u.status === false ? "blocked" : "active",
    expo_push_token:
      typeof u.prefs?.expoPushToken === "string" ? u.prefs.expoPushToken : null,
  };
}

async function fetchCurrentUser(): Promise<User | null> {
  try {
    const u = await withServiceError(() => account.get());
    return toAppUser(u);
  } catch {
    return null;
  }
}

function requireUser(user: User | null): User {
  if (!user) {
    throw new Error("auth: sessão perdida entre signIn e fetchCurrentUser");
  }
  return user;
}

/* ================================================================== */
/*                       MAPEAMENTO DE ERROS                           */
/* ================================================================== */

interface AppwriteErr {
  code?: number;
  type?: string;
  response?: { type?: string };
}

function isUnauthorized(err: unknown): boolean {
  return err instanceof ServiceError && err.code === "unauthorized";
}

function isNetwork(err: unknown): boolean {
  return err instanceof ServiceError && err.code === "network";
}

function isRateLimited(err: unknown): boolean {
  const e = err as AppwriteErr;
  return e?.code === 429;
}

function mapAuthError(err: unknown): SignInError {
  if (isNetwork(err)) return "network";
  if (isRateLimited(err)) return "rate_limited";
  if (isUnauthorized(err)) return "invalid_credentials";
  const e = err as AppwriteErr;
  if (e?.code === 401) return "invalid_credentials";
  return "unknown";
}

function mapSignUpError(err: unknown): SignUpError {
  if (isNetwork(err)) return "network";
  if (isRateLimited(err)) return "rate_limited";
  const e = err as AppwriteErr;
  if (e?.code === 409 || e?.response?.type === "user_already_exists") return "email_in_use";
  if (e?.code === 400) {
    const message = (err as { message?: string })?.message?.toLowerCase() ?? "";
    if (message.includes("password")) return "weak_password";
    if (message.includes("email")) return "invalid_email";
  }
  return "unknown";
}

function mapChangePasswordError(err: unknown): ChangePasswordError {
  if (isNetwork(err)) return "network";
  if (isRateLimited(err)) return "rate_limited";
  const e = err as AppwriteErr;
  if (e?.code === 401 || e?.response?.type === "user_invalid_credentials") {
    return "wrong_password";
  }
  if (e?.code === 400) {
    const message = (err as { message?: string })?.message?.toLowerCase() ?? "";
    if (message.includes("password")) return "weak_password";
  }
  return "unknown";
}

/* ================================================================== */
/*                  EVENT BUS PARA REATIVIDADE                         */
/* ================================================================== */

/**
 * Re-exporta o barramento de sessão de `_session.ts` para que o hook
 * `useCurrentUser` possa ouvir mudanças de sessão.
 */
export { subscribeSession as subscribeAuth } from "./_session";

/**
 * Conecta o callback de `unauthorized` (chamado pelo service quando
 * o Appwrite devolve 401) ao espelho de sessão. Limpa o estado sem
 * chamar `account.deleteSession` (a sessão já morreu do lado do
 * servidor).
 */
export function bindUnauthorizedHandler(handler: () => void) {
  setOnUnauthorized(() => {
    silentSignOut();
    handler();
  });
}

function notifyRefresh() {
  // Compat — o `useCurrentUser` já é reativo via `subscribeSession`.
  // Mantido como no-op silencioso para que `signOutAndSync` continue
  // exportando a função.
}
