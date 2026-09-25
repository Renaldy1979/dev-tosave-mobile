import Constants from "expo-constants";
import { account, notifyUnauthorized, ServiceError, withServiceError } from "./_appwrite";

/**
 * Cliente REST do backend próprio (rotas `/v2`, `docs/ARQUITETURA-V2.md`).
 *
 * - Base URL: `EXPO_PUBLIC_API_URL` (acesso literal) ou
 *   `app.json → expo.extra.apiUrl`. Nenhum endereço fixo no código.
 * - Autenticação: `Authorization: Bearer <JWT do Appwrite>`
 *   (`account.createJWT()`, vale 15 min). O JWT fica em cache e é
 *   renovado antes de vencer ou ao receber 401 (uma nova tentativa).
 * - Erros viram `ServiceError` com o status HTTP (`{ code, message }`
 *   do backend).
 */
const extra = (Constants.expoConfig?.extra ?? {}) as { apiUrl?: string };
export const API_URL: string = (process.env.EXPO_PUBLIC_API_URL || extra.apiUrl || "").replace(/\/+$/, "");

if (__DEV__ && !API_URL) {
  // eslint-disable-next-line no-console
  console.warn("[api] EXPO_PUBLIC_API_URL ausente: defina no .env ou em app.json → expo.extra.apiUrl.");
}

const REQUEST_TIMEOUT_MS = 20_000;
// O JWT vale 15 min; renova com folga de 2 min.
const JWT_TTL_MS = 13 * 60 * 1000;

let jwtCache: { token: string; at: number } | null = null;
let jwtInFlight: Promise<string> | null = null;

/** Esquece o JWT (troca de conta, sair, 401). */
export function clearJwt() {
  jwtCache = null;
  jwtInFlight = null;
}

async function getJwt(force = false): Promise<string> {
  if (!force && jwtCache && Date.now() - jwtCache.at < JWT_TTL_MS) return jwtCache.token;
  if (!jwtInFlight) {
    // `withServiceError`: sessão morta (401) ou conta bloqueada
    // (user_blocked) já disparam o handler que leva ao Login.
    jwtInFlight = withServiceError(() => account.createJWT())
      .then(({ jwt }) => {
        jwtCache = { token: jwt, at: Date.now() };
        return jwt;
      })
      .finally(() => {
        jwtInFlight = null;
      });
  }
  return jwtInFlight;
}

type Query = Record<string, string | number | boolean | undefined | null | string[] | number[]>;

export type ApiRequest = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  query?: Query;
  body?: unknown;
  /** Rota pública (sem JWT), ex.: `/v2/config`. */
  auth?: boolean;
  /**
   * 401 depois de renovar o JWT: `"session"` (padrão) encerra a sessão
   * e leva ao Login; `"return"` só devolve o erro (ex.: senha errada na
   * exclusão de conta).
   */
  on401?: "session" | "return";
};

function buildUrl(path: string, query?: Query): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    const v = Array.isArray(value) ? value.join(",") : String(value);
    if (v === "") continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
  }
  return `${API_URL}${path}${parts.length ? `?${parts.join("&")}` : ""}`;
}

async function send(url: string, req: ApiRequest, jwt: string | null): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: req.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(req.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      },
      body: req.body !== undefined ? JSON.stringify(req.body) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    throw new ServiceError("network", "Sem conexão.", err);
  } finally {
    clearTimeout(timer);
  }
}

/** Chamada ao backend; devolve o JSON da resposta. */
export async function api<T>(path: string, req: ApiRequest = {}): Promise<T> {
  const url = buildUrl(path, req.query);
  const needsAuth = req.auth !== false;

  let res = await send(url, req, needsAuth ? await getJwt() : null);
  if (res.status === 401 && needsAuth) {
    // JWT pode ter vencido antes do previsto: renova e tenta de novo.
    res = await send(url, req, await getJwt(true));
  }

  if (res.ok) {
    const text = await res.text();
    return (text ? JSON.parse(text) : null) as T;
  }

  let message = `Erro ${res.status}`;
  try {
    const payload = (await res.json()) as { message?: unknown };
    if (typeof payload.message === "string" && payload.message) message = payload.message;
  } catch {
    // corpo sem JSON: fica a mensagem genérica.
  }
  if (res.status === 401 && needsAuth && (req.on401 ?? "session") === "session") {
    clearJwt();
    notifyUnauthorized("expired");
    throw new ServiceError("unauthorized", "Sessão expirada.", undefined, { status: 401 });
  }
  throw new ServiceError("unknown", message, undefined, { status: res.status });
}
