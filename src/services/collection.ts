import {
  tablesDb,
  functions,
  APPWRITE_DATABASE_ID,
  APPWRITE_FUNCTION_COLLECTION,
  previewUrl,
  withServiceError,
  isNotFound,
  Query,
} from "./_appwrite";
import type { Models } from "react-native-appwrite";
import { ExecutionMethod } from "react-native-appwrite";
import { getCurrentSession } from "./_session";
import type {
  CollectionItem,
  CollectionItemWithCar,
  CollectionSummary,
} from "@/types";

/**
 * Coleção do usuário — fase 2, Appwrite.
 *
 * `userId` sai dos argumentos da coleção: o servidor usa o header
 * `x-appwrite-user-id` injetado pelo client nas chamadas autenticadas.
 *
 * Mutações (`add`/`set`/`remove`) vão pela Function `collection`
 * (§6 do backend) que é a única fonte da verdade — atualiza
 * `collection_items` + `user_stats` em transação atômica. O app segue
 * otimista (atualiza o store na hora e reconcilia com a resposta).
 *
 * Leituras paginadas usam `getCollectionPaged`. Resumo via
 * `user_stats` (404 → zeros).
 */

const TABLE = {
  collectionItems: "collection_items",
  userStats: "user_stats",
} as const;


/* ================================================================== */
/*                          TIPOS DO APPWRITE                            */
/* ================================================================== */

interface CollectionItemRow extends Models.Row {
  userId: string;
  carId: string;
  quantity: number;
  carTitle: string;
  carToy: string;
  carCollector: string;
  carYear: number;
  carColor: string;
  carScale: string;
  carSeriePosition?: string;
  carImageFileId?: string | null;
  brandId: string;
  brandName: string;
  serieId: string;
  serieTitle: string;
  searchText?: string;
}

interface UserStatsRow extends Models.Row {
  totalItems: number;
  totalModels: number;
  duplicates: number;
}

/* ================================================================== */
/*                            CONVERSORES                               */
/* ================================================================== */

function rowToCollectionItem(row: CollectionItemRow): CollectionItem {
  return {
    id: row.$id,
    userId: row.userId,
    carId: row.carId,
    quantity: row.quantity,
    createdAt: row.$createdAt ?? "",
  };
}

function rowToCar(row: CollectionItemRow): {
  id: string;
  title: string;
  description: string;
  brandId: string;
  brandName: string;
  serieId: string;
  serieTitle: string;
  collector: string;
  color: string;
  toy: string;
  year: number;
  scale: string;
  imagemFull: string | null;
  imagemThumb: string | null;
  seriePosition: string | null;
} {
  return {
    id: row.carId,
    title: row.carTitle,
    description: "",
    brandId: row.brandId,
    brandName: row.brandName,
    serieId: row.serieId,
    serieTitle: row.serieTitle,
    collector: row.carCollector,
    color: row.carColor,
    toy: row.carToy,
    year: row.carYear,
    scale: row.carScale,
    imagemFull: row.carImageFileId
      ? previewUrl(row.carImageFileId, 1080, 85)
      : null,
    imagemThumb: row.carImageFileId
      ? previewUrl(row.carImageFileId, 400, 75)
      : null,
    seriePosition: row.carSeriePosition ?? null,
  };
}

function rowToItemWithCar(row: CollectionItemRow): CollectionItemWithCar {
  return {
    ...rowToCollectionItem(row),
    car: rowToCar(row) as unknown as CollectionItemWithCar["car"],
  };
}

/* ================================================================== */
/*                            LISTAGEM                                   */
/* ================================================================== */

/** Critérios da tela Coleção. */
export interface CollectionListFilters {
  q?: string;
  duplicatesOnly?: boolean;
}

/** Resposta paginada por cursor. */
export interface PaginatedCollection {
  items: CollectionItemWithCar[];
  /** Total só na 1ª página; null nas demais. */
  total: number | null;
  /** Cursor da próxima página; null quando acabou. */
  nextCursor: string | null;
}

/** Lista a coleção paginada por cursor. `userId` sai dos args. */
export async function getCollectionPaged(
  filters: CollectionListFilters & { cursor?: string; pageSize?: number } = {}
): Promise<PaginatedCollection> {
  const pageSize = filters.pageSize ?? 20;
  const isFirstPage = !filters.cursor;
  const queries: string[] = [
    Query.orderDesc("$createdAt"),
    Query.limit(pageSize),
  ];
  if (filters.cursor) {
    queries.push(Query.cursorAfter(filters.cursor));
  }
  if (filters.duplicatesOnly) {
    queries.push(Query.greaterThan("quantity", 1));
  }
  if (filters.q && filters.q.trim().length > 0) {
    // O servidor mantém `searchText` desnormalizado: título + toy +
    // collector. O índice fulltext da coleção (`ft_search`) cobre.
    queries.push(Query.search("searchText", filters.q.trim()));
  }
  const result = await withServiceError(() =>
    tablesDb.listRows<CollectionItemRow>({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLE.collectionItems,
      queries,
    })
  );
  const rows = result.rows ?? [];
  const items = rows.map(rowToItemWithCar);
  const last = rows[rows.length - 1];
  const nextCursor = rows.length === pageSize && last ? last.$id : null;
  return {
    items,
    total: isFirstPage ? result.total ?? items.length : null,
    nextCursor,
  };
}

/** Mantida por compat — a Fase 2 prefere `getCollectionPaged`. */
export async function getCollection(
  filters: CollectionListFilters = {}
): Promise<CollectionItemWithCar[]> {
  const result = await getCollectionPaged({ ...filters, pageSize: 1000 });
  return result.items;
}

/**
 * Resumo: `totalItems`, `totalModels`, `duplicates` (de `user_stats`).
 *
 * O `$id` da linha é o próprio `userId` do Auth (não `"current"`). 404
 * significa "usuário ainda não tem stats" (acontece na primeira mutação
 * da coleção, que cria a linha sob demanda) — devolve zeros em vez de
 * esconder a coleção. Qualquer outro erro sobe como `ServiceError` para
 * a UI mostrar `ErrorState` em vez de um empty state falso.
 */
export async function getCollectionSummary(): Promise<CollectionSummary> {
  const userId = getCurrentSession().user?.id;
  if (!userId) {
    return { totalItems: 0, totalModels: 0, duplicates: 0 };
  }
  try {
    const row = await withServiceError(() =>
      tablesDb.getRow<UserStatsRow>({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: TABLE.userStats,
        rowId: userId,
      })
    );
    return {
      totalItems: row.totalItems,
      totalModels: row.totalModels,
      duplicates: row.duplicates,
    };
  } catch (err) {
    // Só o 404 de verdade (status 404 / `row_not_found`) vira zeros.
    if (isNotFound(err)) return { totalItems: 0, totalModels: 0, duplicates: 0 };
    throw err;
  }
}

interface QuantityRow extends Models.Row {
  carId: string;
  quantity: number;
}

/** Quantidades de uma página (para os corações nas grids). */
export async function getCollectionQuantities(
  carIds: string[]
): Promise<Record<string, number>> {
  if (carIds.length === 0) return {};
  const result = await withServiceError(() =>
    tablesDb.listRows<QuantityRow>({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLE.collectionItems,
      queries: [Query.equal("carId", carIds), Query.limit(carIds.length)],
    })
  );
  const map: Record<string, number> = {};
  for (const row of result.rows ?? []) {
    map[row.carId] = row.quantity;
  }
  return map;
}

/**
 * Quantidade de um carro na coleção. O `$id` da linha em
 * `collection_items` é determinístico (`ci_<hash(userId:carId)>`), mas
 * aqui preferimos consultar por `carId` (a row security já restringe
 * ao usuário logado). 404 → 0 (sem entrada). Outros erros sobem.
 */
export async function getCollectionQuantity(
  carId: string
): Promise<number> {
  try {
    const result = await withServiceError(() =>
      tablesDb.listRows<QuantityRow>({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: TABLE.collectionItems,
        queries: [Query.equal("carId", carId), Query.limit(1)],
      })
    );
    return result.rows?.[0]?.quantity ?? 0;
  } catch (err) {
    if (isNotFound(err)) return 0;
    throw err;
  }
}

/* ================================================================== */
/*                          MUTAÇÕES                                     */
/* ================================================================== */

type CollectionActionResult = {
  item: CollectionItem | null;
  summary: CollectionSummary;
};

/**
 * Chama a Function `collection` síncrona. Body: `{ action, carId,
 * quantity? }`. A resposta vem em `responseBody` como JSON
 * `{ item, summary }`.
 */
async function callCollectionFunction(
  action: "add" | "set" | "remove",
  carId: string,
  quantity?: number
): Promise<CollectionActionResult> {
  const body = JSON.stringify({ action, carId, quantity });
  const execution = await withServiceError(() =>
    functions.createExecution({
      functionId: APPWRITE_FUNCTION_COLLECTION,
      body,
      async: false,
      method: ExecutionMethod.POST,
    })
  );
  // 4xx/5xx da Function → AppwriteException.
  if (execution.responseStatusCode >= 400) {
    let payload: { error?: string } = {};
    try {
      payload = JSON.parse(execution.responseBody || "{}");
    } catch {
      // ignora — payload fica vazio.
    }
    const message = payload.error || `Erro ${execution.responseStatusCode}`;
    throw new Error(message);
  }
  let parsed: CollectionActionResult = { item: null, summary: emptySummary() };
  try {
    parsed = JSON.parse(execution.responseBody || "{}");
  } catch {
    // sem body — fica com o summary vazio.
  }
  return {
    item: parsed.item ?? null,
    summary: parsed.summary ?? emptySummary(),
  };
}

function emptySummary(): CollectionSummary {
  return { totalItems: 0, totalModels: 0, duplicates: 0 };
}

/** Adiciona uma unidade. */
export async function addToCollection(
  carId: string
): Promise<CollectionItem | null> {
  const result = await callCollectionFunction("add", carId);
  return result.item;
}

/** Define a quantidade (0 remove). */
export async function setCollectionQuantity(
  carId: string,
  quantity: number
): Promise<CollectionItem | null> {
  const result = await callCollectionFunction("set", carId, quantity);
  return result.item;
}

/** Remove o item inteiro. */
export async function removeFromCollection(
  carId: string
): Promise<boolean> {
  await callCollectionFunction("remove", carId);
  return true;
}
