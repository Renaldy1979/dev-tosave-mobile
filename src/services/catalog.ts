import {
  tablesDb,
  APPWRITE_DATABASE_ID,
  previewUrl,
  APPWRITE_FUNCTION_COLLECTION,
  withServiceError,
  isNotFound,
  Query,
} from "./_appwrite";
import type { Models } from "react-native-appwrite";
import { withServiceError as withServiceErr } from "./_appwrite";
import type {
  Attribute,
  Brand,
  Car,
  CarDetail,
  CarFilters,
  CarListItem,
  Serie,
} from "@/types";


/**
 * Catálogo — fase 2, Appwrite TablesDB.
 *
 * Tabelas: `cars`, `brands`, `series`, `attributes`, `catalog_meta`.
 * Imagens via `previewUrl` (bucket `car-images`).
 *
 * Paginação por cursor (sem `offset`). `total` só na 1ª página;
 * o Appwrite para em 5.000, então para o catálogo sem filtro usamos
 * `catalog_meta.totalCars`. `years` vem de `catalog_meta.years[]`.
 */

const TABLE = {
  cars: "cars",
  brands: "brands",
  series: "series",
  attributes: "attributes",
  carImages: "car_images",
  catalogMeta: "catalog_meta",
  userSeriesStats: "user_series_stats",
} as const;

/* ================================================================== */
/*                          TIPOS DO APPWRITE                            */
/* ================================================================== */

interface CarRow extends Models.Row {
  title: string;
  description?: string;
  brandId: string;
  brandName: string;
  serieId: string;
  serieTitle: string;
  seriePosition?: string;
  seriePositionNum?: number;
  collector: string;
  color?: string;
  toy: string;
  year: number;
  scale: string;
  imageFileId?: string | null;
  attributeIds?: string[];
  searchText?: string;
}

interface BrandRow extends Models.Row {
  name: string;
  state: "ativa" | "descontinuada" | "em_analise";
  imageFileId?: string | null;
  active: boolean;
  carCount?: number;
}

interface SeriesRow extends Models.Row {
  title: string;
  description?: string;
  imageFileId?: string | null;
  isDefault: boolean;
  carCount?: number;
}

interface AttributeRow extends Models.Row {
  title: string;
  description?: string;
}

interface CatalogMetaRow extends Models.Row {
  totalCars: number;
  years: number[];
}

interface CarImageRow extends Models.Row {
  carId: string;
  fileId: string;
  position: number;
}

/* ================================================================== */
/*                            CONVERSORES                               */
/* ================================================================== */

export function carRowToListItem(row: CarRow): CarListItem {
  return {
    id: row.$id,
    title: row.title,
    description: row.description ?? "",
    brandId: row.brandId,
    brandName: row.brandName,
    serieId: row.serieId,
    serieTitle: row.serieTitle,
    collector: row.collector ?? "",
    color: row.color ?? "",
    toy: row.toy ?? "",
    year: row.year,
    scale: row.scale,
    imagemFull: row.imageFileId
      ? imageUrl(row.imageFileId, 1080, 85)
      : null,
    imagemThumb: row.imageFileId
      ? imageUrl(row.imageFileId, 400, 75)
      : null,
    seriePosition: row.seriePosition ?? null,
    attributeIds: row.attributeIds ?? [],
    createdAt: row.$createdAt ?? "",
    updatedAt: row.$updatedAt ?? "",
  };
}

export type { CarRow };

function carRowToCar(row: CarRow): Car {
  return carRowToListItem(row);
}

function imageUrl(fileId: string, width: number, quality: number): string {
  return previewUrl(fileId, width, quality);
}

function brandRowToBrand(row: BrandRow): Brand {
  return {
    id: row.$id,
    name: row.name,
    state: row.state,
    image: row.imageFileId ? imageUrl(row.imageFileId, 256, 80) : "",
    active: row.active,
    createdAt: "",
  };
}

function seriesRowToSerie(row: SeriesRow): SerieWithCount {
  const s: Serie = {
    id: row.$id,
    title: row.title,
    description: row.description ?? "",
    // Logo da série: 150×150 WebP com transparência. 300 = 2× retina do
    // original (acima disso o Appwrite só amplia). Sem arquivo → "".
    imagem: row.imageFileId ? imageUrl(row.imageFileId, 300, 90) : "",
    isDefault: row.isDefault,
    createdAt: "",
  };
  // `Serie` não tem `carCount` no tipo do app; devolvemos via prop
  // anexada quando relevante (consumidores pegam de `series.find`).
  // Para manter a forma do app, devolvemos um clone com a prop
  // extra; os consumidores (`Home`/`Busca`) só usam `id`/`title`/
  // `imageFileId`.
  return Object.assign(s, { carCount: row.carCount ?? 0 });
}

function attributeRowToAttribute(row: AttributeRow): Attribute {
  return {
    id: row.$id,
    title: row.title,
    description: row.description ?? "",
  };
}

/* ================================================================== */
/*                            LISTAGENS                                  */
/* ================================================================== */

/** Lista todos os carros com filtros opcionais (sem paginação). */
export async function listCars(filters: CarFilters = {}): Promise<Car[]> {
  const queries = buildCarQueries(filters);
  // Para o spec atual a Home/Busca usam listCarsPaged. Esta função
  // permanece para compatibilidade.
  const result = await withServiceErr(() =>
    tablesDb.listRows<CarRow>({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLE.cars,
      queries,
    })
  );
  const items = (result.rows ?? []).map(carRowToCar);
  items.sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return a.title.localeCompare(b.title);
  });
  return items;
}

/** Resposta paginada para grids. `total` só na 1ª página. */
export interface PaginatedCars {
  items: CarListItem[];
  /** Total só na 1ª página; null nas demais (Appwrite para em 5000). */
  total: number | null;
  /** Cursor da próxima página; null quando acabou. */
  nextCursor: string | null;
}

export interface ListCarsPagedOptions extends CarFilters {
  cursor?: string;
  pageSize?: number;
}

/** Lista carros paginado por cursor, conforme §9 do contrato. */
export async function listCarsPaged(
  options: ListCarsPagedOptions = {}
): Promise<PaginatedCars> {
  const pageSize = options.pageSize ?? 20;
  const isFirstPage = !options.cursor;
  const baseQueries = buildCarQueries(options);
  const queries = [
    Query.orderDesc("year"),
    Query.orderAsc("title"),
    Query.limit(pageSize),
    ...(options.cursor ? [Query.cursorAfter(options.cursor)] : []),
    ...baseQueries,
  ];
  const result = await withServiceErr(() =>
    tablesDb.listRows<CarRow>({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLE.cars,
      queries,
    })
  );
  const rows = result.rows ?? [];
  const items = rows.map(carRowToListItem);

  let total: number | null = null;
  if (isFirstPage) {
    // Sem filtro: o `total` do Appwrite para em 5000. Usamos
    // `catalog_meta.totalCars` como total real do catálogo.
    if (options.q || options.serieId || options.brandId || (options.years && options.years.length > 0) || (options.attributeIds && options.attributeIds.length > 0)) {
      // Filtrado: o `total` do Appwrite (até 5000) serve para o resumo.
      total = result.total ?? items.length;
    } else {
      total = await getCatalogTotalCars();
    }
  }

  const last = rows[rows.length - 1];
  const nextCursor = rows.length === pageSize && last ? last.$id : null;

  return { items, total, nextCursor };
}

/** "Mais da série" no detalhe. */
export async function listBySeriePaged(
  serieId: string,
  options: { excludeId?: string; cursor?: string; pageSize?: number } = {}
): Promise<PaginatedCars> {
  const pageSize = options.pageSize ?? 10;
  const queries: string[] = [
    Query.equal("serieId", serieId),
    Query.orderAsc("seriePositionNum"),
    Query.orderAsc("title"),
    Query.limit(pageSize),
  ];
  if (options.excludeId) {
    queries.push(Query.notEqual("$id", options.excludeId));
  }
  if (options.cursor) {
    queries.push(Query.cursorAfter(options.cursor));
  }
  const result = await withServiceErr(() =>
    tablesDb.listRows<CarRow>({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLE.cars,
      queries,
    })
  );
  const items = (result.rows ?? []).map(carRowToListItem);
  const last = (result.rows ?? [])[(result.rows ?? []).length - 1];
  const nextCursor =
    (result.rows ?? []).length === pageSize && last ? last.$id : null;
  return { items, total: result.total ?? items.length, nextCursor };
}

/** Contagem dos carros que casam o filtro (1ª página só). */
export async function countCars(filters: CarFilters = {}): Promise<number> {
  const queries = buildCarQueries(filters);
  const result = await withServiceErr(() =>
    tablesDb.listRows<CarRow>({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLE.cars,
      queries: [...queries, Query.limit(1)],
    })
  );
  return result.total ?? 0;
}

/** Anos disponíveis no catálogo (vem de `catalog_meta.years`). */
export async function listYears(): Promise<number[]> {
  const result = await withServiceErr(() =>
    tablesDb.listRows<CatalogMetaRow>({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLE.catalogMeta,
      queries: [Query.equal("$id", "global")],
    })
  );
  const row = (result.rows ?? [])[0];
  if (row) return [...row.years].sort((a, b) => b - a);
  return [];
}

/** Detalhe de um carro: row + imagens da galeria. */
export async function getCarById(id: string): Promise<CarDetail | null> {
  const carRow = await withServiceErr(() =>
    tablesDb.getRow<CarRow>({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLE.cars,
      rowId: id,
    })
  ).catch(() => null);
  if (!carRow) return null;

  // Marca / série / atributos.
  const [brandRow, serieRow, attrRows] = await Promise.all([
    withServiceErr(() =>
      tablesDb.getRow<BrandRow>({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: TABLE.brands,
        rowId: carRow.brandId,
      })
    ).catch(() => null),
    withServiceErr(() =>
      tablesDb.getRow<SeriesRow>({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: TABLE.series,
        rowId: carRow.serieId,
      })
    ).catch(() => null),
    (async () => {
      const ids = carRow.attributeIds ?? [];
      if (ids.length === 0) return [] as AttributeRow[];
      const result = await withServiceErr(() =>
        tablesDb.listRows<AttributeRow>({
          databaseId: APPWRITE_DATABASE_ID,
          tableId: TABLE.attributes,
          queries: [Query.equal("$id", ids)],
        })
      );
      return result.rows ?? [];
    })(),
  ]);

  if (!brandRow || !serieRow) return null;

  // Galeria extra (posição ≥ 1). `car_images` está vazia na fase 2.
  const imagesResult = await withServiceErr(() =>
    tablesDb.listRows<CarImageRow>({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLE.carImages,
      queries: [
        Query.equal("carId", id),
        Query.orderAsc("position"),
      ],
    })
  ).catch(() => ({ rows: [] }));
  const images = (imagesResult.rows ?? []).map((img) => ({
    id: img.$id,
    carId: img.carId,
    fileId: img.fileId,
    path: imageUrl(img.fileId, 1080, 85),
    position: img.position,
  }));

  return {
    ...carRowToListItem(carRow),
    brand: brandRowToBrand(brandRow),
    serie: seriesRowToSerie(serieRow),
    attributes: attrRows.map(attributeRowToAttribute),
    images,
  };
}

/** Outros carros da mesma série (sem paginação, até `limit`). */
export async function listBySerie(
  serieId: string,
  options: { excludeId?: string; limit?: number } = {}
): Promise<Car[]> {
  const queries: string[] = [
    Query.equal("serieId", serieId),
    Query.orderAsc("seriePositionNum"),
    Query.orderAsc("title"),
    Query.limit(options.limit ?? 10),
  ];
  if (options.excludeId) {
    queries.push(Query.notEqual("$id", options.excludeId));
  }
  const result = await withServiceErr(() =>
    tablesDb.listRows<CarRow>({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLE.cars,
      queries,
    })
  );
  return (result.rows ?? []).map(carRowToCar);
}

/** Séries (com `carCount` já preenchido pelo backend). */
export async function listSeries(
  options: { featured?: boolean } = {}
): Promise<Serie[]> {
  const queries = options.featured
    ? [Query.equal("isDefault", true), Query.orderAsc("title"), Query.limit(500)]
    : [Query.orderAsc("title"), Query.limit(500)];
  const result = await withServiceErr(() =>
    tablesDb.listRows<SeriesRow>({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLE.series,
      queries,
    })
  );
  return (result.rows ?? []).map(seriesRowToSerie);
}

/** Série com o total de miniaturas do catálogo (`series.carCount`). */
export type SerieWithCount = Serie & { carCount: number };

/** Série da lista, com os modelos que o usuário tem nela. */
export type SerieListItem = SerieWithCount & { owned: number };

export interface PaginatedSeries {
  items: SerieListItem[];
  /** Total da consulta (só na 1ª página; `null` nas demais). */
  total: number | null;
  nextCursor: string | null;
}

/**
 * Lista de séries (`10-series.md` §A): A–Z (desempate por `$id`),
 * paginada por cursor. A busca é por trecho do título
 * (`Query.contains`, sem diferenciar maiúsculas): o fulltext junta os
 * termos com OU e ignora palavras curtas como "hw" (backend §15).
 * `owned` de cada série vem de `user_series_stats`, só para a página.
 */
export async function listSeriesPaged(
  options: { search?: string; cursor?: string | null; pageSize?: number } = {}
): Promise<PaginatedSeries> {
  const pageSize = options.pageSize ?? 30;
  const term = options.search?.trim() ?? "";
  const queries: string[] = [Query.orderAsc("title"), Query.orderAsc("$id"), Query.limit(pageSize)];
  if (term) queries.push(Query.contains("title", term));
  if (options.cursor) queries.push(Query.cursorAfter(options.cursor));
  const result = await withServiceErr(() =>
    tablesDb.listRows<SeriesRow>({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLE.series,
      queries,
      total: !options.cursor,
    })
  );
  const rows = result.rows ?? [];
  const last = rows[rows.length - 1];
  const owned = await getOwnedBySerie(rows.map((r) => r.$id));
  return {
    items: rows.map((r) => ({ ...seriesRowToSerie(r), owned: owned[r.$id] ?? 0 })),
    total: options.cursor ? null : result.total ?? rows.length,
    nextCursor: rows.length === pageSize && last ? last.$id : null,
  };
}

interface UserSeriesStatsRow extends Models.Row {
  serieId: string;
  owned: number;
}

/**
 * Modelos possuídos por série, só para os ids pedidos (uma página). A
 * row security de `user_series_stats` já restringe ao usuário logado.
 */
export async function getOwnedBySerie(serieIds: string[]): Promise<Record<string, number>> {
  const map: Record<string, number> = {};
  for (let i = 0; i < serieIds.length; i += 100) {
    const chunk = serieIds.slice(i, i + 100);
    const result = await withServiceErr(() =>
      tablesDb.listRows<UserSeriesStatsRow>({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: TABLE.userSeriesStats,
        queries: [Query.equal("serieId", chunk), Query.greaterThan("owned", 0), Query.limit(chunk.length)],
        total: false,
      })
    );
    for (const row of result.rows ?? []) map[row.serieId] = row.owned;
  }
  return map;
}

/** Uma série pelo id; `null` quando não existe (404). */
export async function getSerie(id: string): Promise<SerieWithCount | null> {
  try {
    const row = await withServiceErr(() =>
      tablesDb.getRow<SeriesRow>({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: TABLE.series,
        rowId: id,
      })
    );
    return seriesRowToSerie(row);
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

/** Séries por id (até 100 por consulta), para as linhas de progresso. */
export async function getSeriesByIds(ids: string[]): Promise<SerieWithCount[]> {
  const out: SerieWithCount[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const result = await withServiceErr(() =>
      tablesDb.listRows<SeriesRow>({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: TABLE.series,
        queries: [Query.equal("$id", chunk), Query.limit(chunk.length)],
      })
    );
    out.push(...(result.rows ?? []).map(seriesRowToSerie));
  }
  return out;
}

/**
 * Todos os carros de uma série, pela posição (`seriePositionNum`
 * crescente); sem posição vão ao fim, por título (`10-series.md` §B.1).
 * Lê em páginas de 100 (uma série tem poucas dezenas de carros).
 */
export async function listAllCarsBySerie(serieId: string): Promise<CarListItem[]> {
  const rows: CarRow[] = [];
  let cursor: string | null = null;
  for (;;) {
    const queries: string[] = [
      Query.equal("serieId", serieId),
      Query.orderAsc("seriePositionNum"),
      Query.orderAsc("title"),
      Query.limit(100),
    ];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const result = await withServiceErr(() =>
      tablesDb.listRows<CarRow>({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: TABLE.cars,
        queries,
        total: false,
      })
    );
    const page = result.rows ?? [];
    rows.push(...page);
    if (page.length < 100) break;
    cursor = page[page.length - 1].$id;
  }
  rows.sort((a, b) => {
    const pa = a.seriePositionNum;
    const pb = b.seriePositionNum;
    const hasA = typeof pa === "number";
    const hasB = typeof pb === "number";
    if (hasA && hasB && pa !== pb) return (pa as number) - (pb as number);
    if (hasA !== hasB) return hasA ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
  return rows.map(carRowToListItem);
}

/** Mantida por compatibilidade. */
export async function listFeaturedSeries(): Promise<Serie[]> {
  return listSeries({ featured: true });
}

/** Marcas (todas ativas, conforme §3.2). */
export async function listBrands(): Promise<Brand[]> {
  const result = await withServiceErr(() =>
    tablesDb.listRows<BrandRow>({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLE.brands,
      queries: [
        Query.notEqual("state", "em_analise"),
        Query.orderAsc("name"),
        Query.limit(500),
      ],
    })
  );
  return (result.rows ?? []).map(brandRowToBrand);
}

/** Atributos. */
export async function listAttributes(): Promise<Attribute[]> {
  const result = await withServiceErr(() =>
    tablesDb.listRows<AttributeRow>({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLE.attributes,
      queries: [Query.orderAsc("title"), Query.limit(500)],
    })
  );
  return (result.rows ?? []).map(attributeRowToAttribute);
}

/**
 * CarCount por série: a coluna `series.carCount` já vem preenchida
 * pelo `catalog-sync` (§6). Esta função só consulta — sem `count`.
 */
export async function getSeriesCarCount(): Promise<Record<string, number>> {
  const result = await withServiceErr(() =>
    tablesDb.listRows<SeriesRow>({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLE.series,
      queries: [Query.limit(500)],
    })
  );
  const map: Record<string, number> = {};
  for (const row of result.rows ?? []) {
    map[row.$id] = row.carCount ?? 0;
  }
  return map;
}

/* ================================================================== */
/*                          HELPERS PRIVADOS                           */
/* ================================================================== */

/** Total de carros do catálogo (`catalog_meta.totalCars`). */
export async function getCatalogTotalCars(): Promise<number> {
  const result = await withServiceErr(() =>
    tablesDb.listRows<CatalogMetaRow>({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLE.catalogMeta,
      queries: [Query.equal("$id", "global")],
    })
  );
  const row = (result.rows ?? [])[0];
  return row?.totalCars ?? 0;
}

/**
 * Monta as queries do Appwrite a partir de um `CarFilters`. A busca
 * usa `Query.search` no índice fulltext `ft_search` (que combina
 * título + toy + collector em `searchText`). Atributos viram um
 * `Query.contains` por atributo (AND entre eles).
 */
function buildCarQueries(filters: CarFilters): string[] {
  const queries: string[] = [];

  if (filters.q && filters.q.trim().length > 0) {
    const term = filters.q.trim().replace(/^#/, "");
    queries.push(Query.search("searchText", term));
  }

  if (filters.serieId) {
    queries.push(Query.equal("serieId", filters.serieId));
  }
  if (filters.brandId) {
    queries.push(Query.equal("brandId", filters.brandId));
  }
  if (filters.years && filters.years.length > 0) {
    queries.push(Query.equal("year", filters.years));
  }
  if (filters.attributeIds && filters.attributeIds.length > 0) {
    // Um `Query.contains` por atributo → AND entre eles.
    for (const id of filters.attributeIds) {
      queries.push(Query.contains("attributeIds", [id]));
    }
  }

  return queries;
}
