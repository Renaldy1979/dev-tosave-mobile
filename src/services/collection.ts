import {
  tablesDb,
  functions,
  storage,
  APPWRITE_DATABASE_ID,
  APPWRITE_FUNCTION_COLLECTION,
  APPWRITE_BUCKET_IMAGES,
  withServiceError,
  Query,
} from "./_appwrite";
import type { Models } from "react-native-appwrite";
import { ExecutionMethod, ImageFormat } from "react-native-appwrite";
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

const Webp: ImageFormat = "webp" as ImageFormat;

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
      ? storage
          .getFilePreviewURL(
              APPWRITE_BUCKET_IMAGES,
              row.carImageFileId,
              1080,
              0,
              undefined,
              85,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              Webp
            )
          .toString()
      : null,
    imagemThumb: row.carImageFileId
      ? storage
          .getFilePreviewURL(
              APPWRITE_BUCKET_IMAGES,
              row.carImageFileId,
              400,
              0,
              undefined,
              75,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              Webp
            )
          .toString()
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

/** Resumo: `totalItems`, `totalModels`, `duplicates` (de `user_stats`). */
export async function getCollectionSummary(): Promise<CollectionSummary> {
  try {
    const row = await withServiceError(() =>
      tablesDb.getRow<UserStatsRow>({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: TABLE.userStats,
        rowId: "current",
      })
    );
    return {
      totalItems: row.totalItems,
      totalModels: row.totalModels,
      duplicates: row.duplicates,
    };
  } catch {
    return { totalItems: 0, totalModels: 0, duplicates: 0 };
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

/** Mantida por compat — usada em vários call sites. */
export async function getCollectionQuantity(
  carId: string
): Promise<number> {
  try {
    const row = await withServiceError(() =>
      tablesDb.getRow<QuantityRow>({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: TABLE.collectionItems,
        rowId: `ci_${carId}`,
      })
    );
    return row.quantity;
  } catch {
    return 0;
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
