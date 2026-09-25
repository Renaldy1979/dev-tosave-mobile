import {
  account,
  withServiceError,
  ServiceError,
  setOnUnauthorized,
  AppwriteException,
  type SessionEndReason,
  appwriteErrorInfo,
} from "./_appwrite";
import { api, clearJwt } from "./_http";
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
 * conta como sucesso. E-mail já existente com a MESMA senha (envio
 * duplo ou resposta perdida) também é sucesso: abre a sessão.
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
        // v2: o id da conta é um UUID, o mesmo `users.id` do Postgres.
        // `ID.unique()` não serve (o backend recusa id que não é UUID).
        userId: uuidV4(),
        email,
        password: input.password,
        name: input.name.trim(),
      })
    );
  } catch (err) {
    const error = mapSignUpError(err, input.password);
    if (error !== "email_in_use") return { ok: false, error };
    // Idempotente: um envio repetido (ou uma resposta perdida) já criou a
    // conta. Se a mesma senha abre a sessão, é a mesma pessoa: sucesso.
    try {
      await openSession(email, input.password);
    } catch (sessionErr) {
      if (isNetwork(sessionErr)) return { ok: false, error: "network" };
      if (isRateLimited(sessionErr)) return { ok: false, error: "rate_limited" };
      return { ok: false, error: "email_in_use" };
    }
    const existing = await fetchCurrentUser();
    if (!existing) return { ok: false, error: "session_failed" };
    setCurrentSession({ user: existing });
    return { ok: true, user: existing };
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

/** Erros possíveis de `requestPasswordRecovery`. */
export type RecoveryRequestError = "rate_limited" | "network" | "unknown";

/**
 * Pede o e-mail de recuperação (`02-login.md` §7): `account.createRecovery`
 * com a URL de retorno da config remota (`passwordRecoveryUrl`). E-mail
 * inexistente (404) conta como enviado: a resposta é sempre a mesma e
 * não revela quais e-mails têm conta.
 */
export async function requestPasswordRecovery(
  email: string,
  url: string
): Promise<{ ok: true } | { ok: false; error: RecoveryRequestError }> {
  try {
    await authCall(() => account.createRecovery({ email: email.trim().toLowerCase(), url }));
    return { ok: true };
  } catch (err) {
    if (isNetwork(err)) return { ok: false, error: "network" };
    if (isRateLimited(err)) return { ok: false, error: "rate_limited" };
    const { status, type } = appwriteErrorInfo(err);
    if (status === 404 || type === "user_not_found") return { ok: true };
    return { ok: false, error: "unknown" };
  }
}

/** Erros possíveis de `completePasswordRecovery`. */
export type RecoveryCompleteError =
  | "expired"
  | "weak_password"
  | "common_password"
  | "rate_limited"
  | "network"
  | "unknown";

/**
 * Define a nova senha a partir do link (`userId` + `secret`):
 * `account.updateRecovery`. Link inválido ou expirado (401
 * `user_invalid_token`) e usuário inexistente (404) → `expired`.
 * Não abre sessão: a tela manda para o Login.
 */
export async function completePasswordRecovery(
  userId: string,
  secret: string,
  password: string
): Promise<{ ok: true } | { ok: false; error: RecoveryCompleteError }> {
  try {
    await authCall(() => account.updateRecovery({ userId, secret, password }));
    return { ok: true };
  } catch (err) {
    if (isNetwork(err)) return { ok: false, error: "network" };
    if (isRateLimited(err)) return { ok: false, error: "rate_limited" };
    const { status, type } = appwriteErrorInfo(err);
    if (status === 401 || status === 404 || type === "user_invalid_token") {
      return { ok: false, error: "expired" };
    }
    if (type === "general_argument_invalid") {
      return { ok: false, error: password.length >= 8 ? "common_password" : "weak_password" };
    }
    return { ok: false, error: "unknown" };
  }
}

/** Erros possíveis de `deleteAccount`. */
export type DeleteAccountError = "wrong_password" | "rate_limited" | "network" | "unknown";

/** Resultado de `deleteAccount`. */
export type DeleteAccountResult = { ok: true } | { ok: false; error: DeleteAccountError };

/**
 * Exclui a conta (`07-perfil.md` §5.1): `POST /v2/me/delete { password }`
 * no backend, que confere a senha no Appwrite, apaga os dados no Postgres
 * e depois o usuário no Appwrite (com as sessões).
 *
 * Status → erro: 401 wrong_password · 429 rate_limited · outros unknown
 * (409 = usuário com notícias publicadas).
 * Resposta perdida (sem rede): consulta `account.get()`; 401 = a conta já
 * foi apagada → sucesso; se responder, a conta existe.
 *
 * Não limpa o estado local: quem chama navega para o Login e depois
 * encerra a sessão local (nunca `deleteSession`, que daria 401).
 */
export async function deleteAccount(password: string): Promise<DeleteAccountResult> {
  try {
    await api<{ ok: true }>("/v2/me/delete", { method: "POST", body: { password }, on401: "return" });
    clearJwt();
    return { ok: true };
  } catch (err) {
    const { status } = appwriteErrorInfo(err);
    if (status === 401) return { ok: false, error: "wrong_password" };
    if (status === 429) return { ok: false, error: "rate_limited" };
    if (!isNetwork(err)) return { ok: false, error: "unknown" };
    // Resposta perdida: a conta pode ter sido apagada mesmo assim.
    try {
      await authCall(() => account.get());
      return { ok: false, error: "network" };
    } catch (checkErr) {
      if (appwriteErrorInfo(checkErr).status === 401) {
        clearJwt();
        return { ok: true };
      }
      return { ok: false, error: "network" };
    }
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
  clearJwt();
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
    const user = toAppUser(u);
    // Sessão restaurada (app reaberto já logado): preenche o espelho dos
    // services também, não só o store do hook.
    setCurrentSession({ user });
    return user;
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
 * UUID v4 para o `$id` da conta no cadastro (arquitetura v2: é o mesmo
 * `users.id` do Postgres). O id não é segredo, então `Math.random`
 * basta; evita um módulo nativo novo (`expo-crypto`) no build.
 */
function uuidV4(): string {
  const hex: string[] = [];
  for (let i = 0; i < 16; i++) hex.push(Math.floor(Math.random() * 256).toString(16).padStart(2, "0"));
  hex[6] = ((parseInt(hex[6], 16) & 0x0f) | 0x40).toString(16).padStart(2, "0");
  hex[8] = ((parseInt(hex[8], 16) & 0x3f) | 0x80).toString(16).padStart(2, "0");
  const h = hex.join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
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
  // Nova sessão: o JWT em cache (se houver) era de outra conta.
  clearJwt();
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
export function bindUnauthorizedHandler(handler: (reason: SessionEndReason) => void) {
  setOnUnauthorized((reason) => {
    clearJwt();
    silentSignOut();
    handler(reason);
  });
}

function notifyRefresh() {
  // Compat — o `useCurrentUser` já é reativo via `subscribeSession`.
  // Mantido como no-op silencioso para que `signOutAndSync` continue
  // exportando a função.
}
