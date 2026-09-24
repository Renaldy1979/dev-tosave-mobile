import { Client, Account, TablesDB, Storage, Functions, AppwriteException, Query } from "react-native-appwrite";
import Constants from "expo-constants";

/**
 * Cliente do Appwrite (fase 2 — backend `tosave` no Appwrite 1.8.1).
 *
 * Endpoint e Project ID são públicos (não são segredos) e por isso
 * ficam em `app.json → expo.extra`. O Expo **só injeta `process.env`
 * com acesso literal** (Expo não consegue ler `process.env[NOME_VARIAVEL]`
 * dinâmico); por isso aqui a leitura é literal.
 *
 * Prioridade:
 * 1. `process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT` (literal) —
 *    override de build/dev via `.env`.
 * 2. `Constants.expoConfig.extra.appwriteEndpoint` (de `app.json`).
 *
 * Mesmo padrão para o Project ID. ID do banco e bucket ficam também
 * em `app.json → expo.extra` por consistência (não são segredos).
 */
type ExpoExtra = {
  appwriteEndpoint?: string;
  appwriteProjectId?: string;
  appwriteDatabaseId?: string;
  appwriteBucketImages?: string;
};

function readExtra(): ExpoExtra {
  // `Constants.expoConfig` é `null` em alguns testes SSR; o optional
  // chaining evita o erro.
  const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;
  return extra;
}

// Acesso literal ao `process.env` (o Expo só injeta literais).
const ENV_ENDPOINT = process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT;
const ENV_PROJECT_ID = process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID;

const extra = readExtra();

export const APPWRITE_ENDPOINT: string = ENV_ENDPOINT || extra.appwriteEndpoint || "";
export const APPWRITE_PROJECT_ID: string =
  ENV_PROJECT_ID || extra.appwriteProjectId || "";

export const APPWRITE_DATABASE_ID: string = extra.appwriteDatabaseId ?? "tosave";
export const APPWRITE_BUCKET_IMAGES: string =
  extra.appwriteBucketImages ?? "car-images";
export const APPWRITE_FUNCTION_COLLECTION = "collection";

/**
 * Categoria `ImageFormat` (vinda do `react-native-appwrite`) só exporta
 * o tipo `ImageFormat`. O valor runtime é a string `"webp"`. Mantemos
 * a constante aqui para o `storage.getFilePreviewURL` aceitar o tipo.
 */
export const ImageFormatWebp = "webp" as const;

/**
 * URL de preview (WebP redimensionado) de um arquivo do bucket de
 * imagens, montada à mão com `encodeURIComponent`: não depende do
 * `URL`/`searchParams` do runtime (o `getFilePreviewURL` do SDK usa os
 * dois). O bucket tem leitura pública; `project` basta para o Appwrite.
 */
export function previewUrl(fileId: string, width: number, quality: number): string {
  return (
    `${APPWRITE_ENDPOINT.replace(/\/+$/, "")}` +
    `/storage/buckets/${encodeURIComponent(APPWRITE_BUCKET_IMAGES)}` +
    `/files/${encodeURIComponent(fileId)}/preview` +
    `?width=${width}&height=0&quality=${quality}&output=webp` +
    `&project=${encodeURIComponent(APPWRITE_PROJECT_ID)}`
  );
}

export const client = new Client();

if (APPWRITE_ENDPOINT) client.setEndpoint(APPWRITE_ENDPOINT);
if (APPWRITE_PROJECT_ID) client.setProject(APPWRITE_PROJECT_ID);

export const account = new Account(client);
export const tablesDb = new TablesDB(client);
export const storage = new Storage(client);
export const functions = new Functions(client);

export { AppwriteException, Query };

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
  /** HTTP status do Appwrite (0 quando não houve resposta). */
  status: number;
  /** `type` do erro do Appwrite (ex.: `row_not_found`), ou `""`. */
  type: string;
  constructor(code: ServiceErrorCode, message: string, cause?: unknown) {
    super(message);
    this.code = code;
    this.cause = cause;
    const info = appwriteErrorInfo(cause);
    this.status = info.status;
    this.type = info.type;
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

/** `true` quando o Appwrite respondeu 404 (linha/arquivo inexistente). */
export function isNotFound(err: unknown): boolean {
  const { status, type } = appwriteErrorInfo(err);
  return status === 404 || type === "row_not_found" || type === "document_not_found";
}

type UnauthorizedHandler = () => void;

let onUnauthorized: UnauthorizedHandler | null = null;

/**
 * Injeta o callback que dispara o redirect ao Login quando uma chamada
 * autenticada recebe 401. Chamado uma vez no `_layout` raiz.
 */
export function setOnUnauthorized(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

function notifyUnauthorized() {
  onUnauthorized?.();
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
      if (code === 401) {
        notifyUnauthorized();
        throw new ServiceError("unauthorized", "Sessão expirada.", err);
      }
      throw new ServiceError("unknown", err.message || "Erro do servidor.", err);
    }
    // Falha de rede ou cliente.
    throw new ServiceError("network", "Sem conexão.", err);
  }
}
