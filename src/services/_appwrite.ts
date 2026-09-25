import { Client, Account, AppwriteException } from "react-native-appwrite";
import Constants from "expo-constants";

/**
 * Cliente do Appwrite — arquitetura v2 (`docs/ARQUITETURA-V2.md`).
 *
 * O Appwrite fica só com o login (Auth: cadastro, sessão, JWT,
 * recuperação de senha, bloqueio) e as imagens (Storage, lido direto
 * pela URL de preview). Os dados vêm do backend próprio por REST
 * (`_http.ts`, rotas `/v2`).
 *
 * Endpoint e Project ID são públicos: `app.json → expo.extra`, com
 * override por `.env` (o Expo só injeta `process.env` com acesso
 * literal).
 */
type ExpoExtra = {
  appwriteEndpoint?: string;
  appwriteProjectId?: string;
  appwriteBucketImages?: string;
  appwriteBucketSeriesLogos?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;

// Acesso literal ao `process.env` (o Expo só injeta literais).
const ENV_ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT;
const ENV_PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;

export const APPWRITE_ENDPOINT: string = ENV_ENDPOINT || extra.appwriteEndpoint || "";
export const APPWRITE_PROJECT_ID: string = ENV_PROJECT_ID || extra.appwriteProjectId || "";

const BUCKET_CAR_IMAGES = extra.appwriteBucketImages ?? "car-images";
const BUCKET_SERIES_LOGOS = extra.appwriteBucketSeriesLogos ?? "series-logos";

/**
 * URL de preview (WebP redimensionado) de um arquivo público do Storage,
 * montada à mão com `encodeURIComponent` (não depende de `URL` do
 * runtime). O backend não fica no caminho da imagem.
 */
function previewUrl(bucket: string, fileId: string, width: number, quality: number): string {
  return (
    `${APPWRITE_ENDPOINT.replace(/\/+$/, "")}` +
    `/storage/buckets/${encodeURIComponent(bucket)}` +
    `/files/${encodeURIComponent(fileId)}/preview` +
    `?width=${width}&height=0&quality=${quality}&output=webp` +
    `&project=${encodeURIComponent(APPWRITE_PROJECT_ID)}`
  );
}

/** Foto de carro (`car-images`): grid 400/75, detalhe 1080/85. */
export function carImageUrl(fileId: string | null | undefined, size: "grid" | "full"): string | null {
  if (!fileId) return null;
  return size === "full" ? previewUrl(BUCKET_CAR_IMAGES, fileId, 1080, 85) : previewUrl(BUCKET_CAR_IMAGES, fileId, 400, 75);
}

/** Logo de série (`series-logos`, 150×150 com transparência): 300/90. */
export function serieLogoUrl(fileId: string | null | undefined): string {
  return fileId ? previewUrl(BUCKET_SERIES_LOGOS, fileId, 300, 90) : "";
}

export const client = new Client();

if (APPWRITE_ENDPOINT) client.setEndpoint(APPWRITE_ENDPOINT);
if (APPWRITE_PROJECT_ID) client.setProject(APPWRITE_PROJECT_ID);

export const account = new Account(client);

export { AppwriteException };

/**
 * Em desenvolvimento, avisa se o endpoint ficou vazio (sem .env nem
 * `app.json` configurado). Em produção, o bundle já traz os valores;
 * o aviso não roda.
 */
if (__DEV__ && (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID)) {
  // eslint-disable-next-line no-console
  console.warn(
    "[appwrite] endpoint/projectId ausentes — defina `appwriteEndpoint` " +
      "e `appwriteProjectId` em app.json → expo.extra, ou via " +
      "EXPO_PUBLIC_APPWRITE_ENDPOINT / EXPO_PUBLIC_APPWRITE_PROJECT_ID."
  );
}

/**
 * Erro normalizado dos services da fase 2.
 *
 * - `'unauthorized'` → sessão expirada; o app volta para o Login.
 * - `'network'` → sem rede / timeout.
 * - `'unknown'` → qualquer outra falha do Appwrite ou do client
 *   (inclui `403 general_service_disabled` quando Account/Functions
 *   estiverem desligados no console).
 *
 * O `getCurrentUser` da splash **não** dispara `onUnauthorized`
 * (401 ali é normal e devolve `null` direto). As outras chamadas usam
 * o helper `withServiceError` para padronizar o comportamento.
 */
export type ServiceErrorCode = "unauthorized" | "network" | "unknown";

export class ServiceError extends Error {
  code: ServiceErrorCode;
  cause?: unknown;
  /** HTTP status (Appwrite ou backend; 0 quando não houve resposta). */
  status: number;
  /** `type` do erro do Appwrite (ex.: `row_not_found`), ou `""`. */
  type: string;
  constructor(
    code: ServiceErrorCode,
    message: string,
    cause?: unknown,
    /** Status/type explícitos (erros HTTP do backend). */
    info?: { status: number; type?: string }
  ) {
    super(message);
    this.code = code;
    this.cause = cause;
    const fromCause = appwriteErrorInfo(cause);
    this.status = info?.status ?? fromCause.status;
    this.type = info?.type ?? fromCause.type;
  }
}

/**
 * Lê `status` e `type` de um erro do Appwrite, seja a própria
 * `AppwriteException` ou um `ServiceError` que a embrulhou. O `type`
 * vem do campo `type` da exceção ou, na falta dele, do JSON em
 * `response`.
 */
export function appwriteErrorInfo(err: unknown): { status: number; type: string } {
  if (err instanceof ServiceError) return { status: err.status, type: err.type };
  if (!(err instanceof AppwriteException)) return { status: 0, type: "" };
  let type = err.type ?? "";
  if (!type && typeof err.response === "string" && err.response) {
    try {
      const parsed = JSON.parse(err.response) as { type?: unknown };
      if (typeof parsed.type === "string") type = parsed.type;
    } catch {
      // `response` não é JSON: fica sem `type`.
    }
  }
  return { status: err.code ?? 0, type };
}

/** `true` quando a resposta foi 404 (carro, série ou linha inexistente). */
export function isNotFound(err: unknown): boolean {
  return appwriteErrorInfo(err).status === 404;
}

/** Por que a sessão caiu: expirou/revogada, ou a conta foi bloqueada. */
export type SessionEndReason = "expired" | "blocked";

type UnauthorizedHandler = (reason: SessionEndReason) => void;

let onUnauthorized: UnauthorizedHandler | null = null;

/**
 * Injeta o callback que dispara o redirect ao Login quando uma chamada
 * autenticada recebe 401. Chamado uma vez no `_layout` raiz.
 */
export function setOnUnauthorized(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

export function notifyUnauthorized(reason: SessionEndReason) {
  onUnauthorized?.(reason);
}

/**
 * Envelope padrão para chamadas do Appwrite. Mapeia erros conhecidos
 * para `ServiceError` com códigos estáveis.
 */
export async function withServiceError<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof AppwriteException) {
      const code = err.code ?? 0;
      // Conta bloqueada pelo admin (portal): 401 no Appwrite 1.8 e 403
      // a partir do 1.9, sempre com `type` `user_blocked`.
      if ((code === 401 || code === 403) && appwriteErrorInfo(err).type === "user_blocked") {
        notifyUnauthorized("blocked");
        throw new ServiceError("unauthorized", "Conta desativada.", err);
      }
      if (code === 401) {
        notifyUnauthorized("expired");
        throw new ServiceError("unauthorized", "Sessão expirada.", err);
      }
      throw new ServiceError("unknown", err.message || "Erro do servidor.", err);
    }
    // Falha de rede ou cliente.
    throw new ServiceError("network", "Sem conexão.", err);
  }
}
