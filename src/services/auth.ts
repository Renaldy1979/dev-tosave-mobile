import {
  account,
  withServiceError,
  ServiceError,
  setOnUnauthorized,
  AppwriteException,
  appwriteErrorInfo,
} from "./_appwrite";
import {
  getCurrentSession,
  setCurrentSession,
  subscribeSession,
  silentSignOut,
} from "./_session";
import type { Session } from "@/types";

/**
 * Erros possíveis de `signIn`. Mapeados pelo `type` do Appwrite.
 */
export type SignInError =
  | "invalid_credentials"
  | "blocked"
  | "rate_limited"
  | "network"
  | "unknown";

/** Resultado de `signIn`. */
export type SignInResult =
  | { ok: true; user: User }
  | { ok: false; error: SignInError };

/**
 * Login. Chama `account.createEmailPasswordSession`.
 * Erros (por `type`):
 * - `user_invalid_credentials` → invalid_credentials
 * - `user_blocked` → blocked
 * - `user_session_already_exists` → sucesso (segue com `account.get`)
 * - 429 → rate_limited
 * - outros → unknown
 */
export async function signIn(email: string, password: string): Promise<SignInResult> {
  try {
    await openSession(email, password);
    const user = await fetchCurrentUser();
    if (!user) return { ok: false, error: "unknown" };
    setCurrentSession({ user });
    return { ok: true, user };
  } catch (err) {
    return { ok: false, error: mapSignInError(err) };
  }
}

/** Erros possíveis de `signUp`. */
export type SignUpError =
  | "email_in_use"
  | "weak_password"
  | "common_password"
  | "personal_data"
  | "invalid_email"
  | "blocked"
  | "session_failed"
  | "rate_limited"
  | "network"
  | "unknown";

/** Resultado de `signUp`. */
export type SignUpResult =
  | { ok: true; user: User }
  | { ok: false; error: SignUpError };

/**
 * Cadastro. Cria a conta e abre a sessão em seguida.
 *
 * Erros de `account.create` (por `type`):
 * - `user_already_exists` / `user_email_already_exists` → email_in_use
 * - `password_personal_data` → personal_data
 * - `password_recently_used` / `password_in_history` → common_password
 * - `general_argument_invalid` em `password` → weak_password (menos de
 *   8 caracteres) ou common_password (política de dicionário)
 * - `general_argument_invalid` em `email` → invalid_email
 * - 429 → rate_limited
 *
 * Conta criada mas sessão recusada → `session_failed` (a tela manda
 * para o Login com o e-mail preenchido). `user_session_already_exists`
 * conta como sucesso.
 */
export async function signUp(input: {
  name: string;
  email: string;
  password: string;
}): Promise<SignUpResult> {
  const email = input.email.trim().toLowerCase();
  try {
    await authCall(() =>
      account.create({
        userId: "user-" + cryptoId(),
        email,
        password: input.password,
        name: input.name.trim(),
      })
    );
  } catch (err) {
    return { ok: false, error: mapSignUpError(err, input.password) };
  }
  try {
    await openSession(email, input.password);
  } catch (err) {
    if (isNetwork(err)) return { ok: false, error: "network" };
    if (appwriteErrorInfo(err).type === "user_blocked") return { ok: false, error: "blocked" };
    return { ok: false, error: "session_failed" };
  }
  const user = await fetchCurrentUser();
  if (!user) return { ok: false, error: "session_failed" };
  setCurrentSession({ user });
  return { ok: true, user };
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
    // `authCall`: senha atual errada é 401 e não pode derrubar a sessão.
    await authCall(() =>
      account.updatePassword({ password: newPassword, oldPassword: currentPassword })
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


/* ================================================================== */
/*                       MAPEAMENTO DE ERROS                           */
/* ================================================================== */

function isNetwork(err: unknown): boolean {
  return err instanceof ServiceError && err.code === "network";
}

function isRateLimited(err: unknown): boolean {
  return appwriteErrorInfo(err).status === 429;
}

/**
 * Chamada de Auth **sem** `withServiceError`: um 401 aqui é resposta
 * esperada (senha errada, conta bloqueada) e não pode disparar o
 * handler de sessão expirada. A `AppwriteException` sobe intacta para
 * o mapeamento por `type`; falha sem resposta vira `ServiceError`
 * `network`.
 */
async function authCall<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof AppwriteException) throw err;
    throw new ServiceError("network", "Sem conexão.", err);
  }
}

/** Abre a sessão; `user_session_already_exists` conta como sucesso. */
async function openSession(email: string, password: string): Promise<void> {
  try {
    await authCall(() =>
      account.createEmailPasswordSession({
        email: email.trim().toLowerCase(),
        password,
      })
    );
  } catch (err) {
    if (appwriteErrorInfo(err).type === "user_session_already_exists") return;
    throw err;
  }
}

function argumentMessage(err: unknown): string {
  return err instanceof Error ? err.message.toLowerCase() : "";
}

function mapSignInError(err: unknown): SignInError {
  if (isNetwork(err)) return "network";
  if (isRateLimited(err)) return "rate_limited";
  const { type } = appwriteErrorInfo(err);
  if (type === "user_blocked") return "blocked";
  // `general_argument_invalid`: senha com menos de 8 caracteres nunca
  // é válida no Appwrite; para quem entra, é credencial errada.
  if (type === "user_invalid_credentials" || type === "general_argument_invalid") {
    return "invalid_credentials";
  }
  return "unknown";
}

function mapSignUpError(err: unknown, password: string): SignUpError {
  if (isNetwork(err)) return "network";
  if (isRateLimited(err)) return "rate_limited";
  const { status, type } = appwriteErrorInfo(err);
  if (type === "user_already_exists" || type === "user_email_already_exists" || status === 409) {
    return "email_in_use";
  }
  if (type === "password_personal_data") return "personal_data";
  if (type === "password_recently_used" || type === "password_in_history") {
    return "common_password";
  }
  if (type === "general_argument_invalid") {
    const message = argumentMessage(err);
    if (message.includes("password")) {
      return password.length >= 8 ? "common_password" : "weak_password";
    }
    if (message.includes("email")) return "invalid_email";
  }
  return "unknown";
}

function mapChangePasswordError(err: unknown): ChangePasswordError {
  if (isNetwork(err)) return "network";
  if (isRateLimited(err)) return "rate_limited";
  const { status, type } = appwriteErrorInfo(err);
  if (type === "user_invalid_credentials" || status === 401) return "wrong_password";
  if (type === "general_argument_invalid" && argumentMessage(err).includes("password")) {
    return "weak_password";
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
