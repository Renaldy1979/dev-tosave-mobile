import { carImageUrl, isNotFound, serieLogoUrl } from "./_appwrite";
import { api } from "./_http";
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
 * Catálogo — backend próprio, rotas `/v2` (`backendToSave/docs/API-V2.md`).
 *
 * Carros, séries, marcas e atributos vêm do Postgres por REST. As imagens
 * não passam pelo backend: o app monta a URL de preview do Appwrite a
 * partir de `imageFileId` (`car-images` e `series-logos`).
 *
 * Paginação por cursor opaco: `{ items, total, nextCursor }`, com `total`
 * só na 1ª página.
 */

/* ================================================================== */
/*                         TIPOS DA API (v2)                            */
/* ================================================================== */

/** `CarItem` da API. */
export type ApiCar = {
  id: string;
  title: string;
  description: string;
  brandId: string;
  brandName: string;
  serieId: string;
  serieTitle: string;
  seriePosition: string | null;
  seriePositionNum: number | null;
  collector: string;
  color: string;
  toy: string;
  year: number;
  scale: string;
  imageFileId: string | null;
  attributeIds: string[];
  /** Posse do usuário logado (API v2: todo carro traz). */
  owned?: boolean;
  quantity?: number;
};

type ApiSerie = {
  id: string;
  title: string;
  description: string;
  isDefault: boolean;
  imageFileId: string | null;
  carCount: number;
  owned?: number;
};

type ApiBrand = { id: string; name: string; state: Brand["state"]; active: boolean; carCount?: number };

type ApiPage<T> = { items: T[]; total: number | null; nextCursor: string | null };

/* ================================================================== */
/*                            CONVERSORES                               */
/* ================================================================== */

export function apiCarToListItem(car: ApiCar): CarListItem {
  return {
    id: car.id,
    title: car.title,
    description: car.description ?? "",
    brandId: car.brandId,
    brandName: car.brandName ?? "",
    serieId: car.serieId,
    serieTitle: car.serieTitle ?? "",
    collector: car.collector ?? "",
    color: car.color ?? "",
    toy: car.toy ?? "",
    year: car.year,
    scale: car.scale ?? "",
    imagemFull: carImageUrl(car.imageFileId, "full"),
    imagemThumb: carImageUrl(car.imageFileId, "grid"),
    seriePosition: car.seriePosition ?? null,
    attributeIds: car.attributeIds ?? [],
    quantity: car.quantity ?? (car.owned ? 1 : 0),
    createdAt: "",
    updatedAt: "",
  };
}

/** Série com o total de miniaturas do catálogo. */
export type SerieWithCount = Serie & { carCount: number };

/** Série da lista, com os modelos que o usuário tem nela. */
export type SerieListItem = SerieWithCount & { owned: number };

function apiSerieToSerie(s: ApiSerie): SerieListItem {
  return {
    id: s.id,
    title: s.title,
    description: s.description ?? "",
    // Logo 150×150 com transparência (bucket `series-logos`); sem arquivo → "".
    imagem: serieLogoUrl(s.imageFileId),
    isDefault: s.isDefault,
    createdAt: "",
    carCount: s.carCount ?? 0,
    owned: s.owned ?? 0,
  };
}

function apiBrandToBrand(b: ApiBrand): Brand {
  return { id: b.id, name: b.name, state: b.state, image: "", active: b.active, createdAt: "" };
}

/** Filtros de `/v2/cars` (anos e atributos separados por vírgula). */
function carQuery(filters: CarFilters) {
  return {
    q: filters.q?.trim() || undefined,
    years: filters.years && filters.years.length > 0 ? filters.years : undefined,
    serieId: filters.serieId,
    brandId: filters.brandId,
    attributeIds: filters.attributeIds && filters.attributeIds.length > 0 ? filters.attributeIds : undefined,
  };
}

/* ================================================================== */
/*                              CARROS                                  */
/* ================================================================== */

/** Resposta paginada para grids. `total` só na 1ª página. */
export interface PaginatedCars {
  items: CarListItem[];
  total: number | null;
  nextCursor: string | null;
}

export interface ListCarsPagedOptions extends CarFilters {
  cursor?: string;
  pageSize?: number;
}

/** Carros paginados por cursor (ano ↓, título ↑). */
export async function listCarsPaged(options: ListCarsPagedOptions = {}): Promise<PaginatedCars> {
  const page = await api<ApiPage<ApiCar>>("/v2/cars", {
    query: { ...carQuery(options), cursor: options.cursor, limit: options.pageSize ?? 20 },
  });
  return { items: page.items.map(apiCarToListItem), total: page.total, nextCursor: page.nextCursor };
}

/** Primeira página de carros com filtros (compatibilidade). */
export async function listCars(filters: CarFilters = {}): Promise<Car[]> {
  const page = await listCarsPaged({ ...filters, pageSize: 100 });
  return page.items;
}

/** Contagem dos carros que casam o filtro. */
export async function countCars(filters: CarFilters = {}): Promise<number> {
  const res = await api<{ total: number }>("/v2/cars/count", { query: carQuery(filters) });
  return res.total ?? 0;
}

/** Anos do catálogo, do mais novo para o mais antigo. */
export async function listYears(): Promise<number[]> {
  return api<number[]>("/v2/cars/years");
}

type ApiCarDetail = ApiCar & {
  brand: { id: string; name: string };
  serie: ApiSerie;
  attributes: Attribute[];
  images: { id: string; fileId?: string | null; imageFileId?: string | null; position: number }[];
};

/** Detalhe de um carro; `null` quando não existe (404). */
export async function getCarById(id: string): Promise<CarDetail | null> {
  let car: ApiCarDetail;
  try {
    car = await api<ApiCarDetail>(`/v2/cars/${encodeURIComponent(id)}`);
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
  const images = (car.images ?? [])
    .map((img) => ({
      id: img.id,
      carId: car.id,
      path: carImageUrl(img.imageFileId ?? img.fileId, "full") ?? "",
      position: img.position,
    }))
    .filter((img) => img.path);
  return {
    ...apiCarToListItem(car),
    brand: { id: car.brand.id, name: car.brand.name, state: "ativa", image: "", active: true, createdAt: "" },
    serie: apiSerieToSerie(car.serie),
    attributes: car.attributes ?? [],
    images,
  };
}

/** "Mais da série" no detalhe: carros da série pela posição. */
export async function listBySeriePaged(
  serieId: string,
  options: { excludeId?: string; cursor?: string; pageSize?: number } = {}
): Promise<PaginatedCars> {
  const pageSize = options.pageSize ?? 10;
  // Pede 1 a mais para compensar o carro excluído (o atual).
  const page = await api<{ items: ApiCar[]; counts: { total: number }; nextCursor: string | null }>(
    `/v2/series/${encodeURIComponent(serieId)}/cars`,
    { query: { filter: "all", cursor: options.cursor, limit: options.excludeId ? pageSize + 1 : pageSize } }
  );
  const items = page.items
    .filter((c) => c.id !== options.excludeId)
    .slice(0, pageSize)
    .map(apiCarToListItem);
  return { items, total: page.counts?.total ?? items.length, nextCursor: page.nextCursor };
}

/** Outros carros da mesma série (sem paginação, até `limit`). */
export async function listBySerie(
  serieId: string,
  options: { excludeId?: string; limit?: number } = {}
): Promise<Car[]> {
  const page = await listBySeriePaged(serieId, { excludeId: options.excludeId, pageSize: options.limit ?? 10 });
  return page.items;
}

export type SerieCarsFilter = "all" | "owned" | "missing";

export interface PaginatedSerieCars {
  items: CarListItem[];
  /** Contagens da série inteira (rótulos do segmento). */
  counts: { total: number; owned: number; missing: number };
  nextCursor: string | null;
}

/**
 * Carros de uma série na ordem da série, filtrados no servidor
 * (Todos / Na coleção / Faltam), com a posse em cada carro.
 */
export async function listSerieCars(
  serieId: string,
  options: { filter?: SerieCarsFilter; cursor?: string | null; pageSize?: number } = {}
): Promise<PaginatedSerieCars> {
  const page = await api<{
    items: ApiCar[];
    counts: { total: number; owned: number; missing: number };
    nextCursor: string | null;
  }>(`/v2/series/${encodeURIComponent(serieId)}/cars`, {
    query: { filter: options.filter ?? "all", cursor: options.cursor, limit: options.pageSize ?? 20 },
  });
  return { items: page.items.map(apiCarToListItem), counts: page.counts, nextCursor: page.nextCursor };
}

/* ================================================================== */
/*                              SÉRIES                                  */
/* ================================================================== */

export interface PaginatedSeries {
  items: SerieListItem[];
  total: number | null;
  nextCursor: string | null;
}

/**
 * Lista de séries (`10-series.md` §A): A–Z, busca por trecho do título,
 * com `owned` (modelos do usuário) em cada série.
 */
export async function listSeriesPaged(
  options: { search?: string; cursor?: string | null; pageSize?: number } = {}
): Promise<PaginatedSeries> {
  const page = await api<ApiPage<ApiSerie>>("/v2/series", {
    query: { q: options.search?.trim() || undefined, cursor: options.cursor, limit: options.pageSize ?? 30 },
  });
  return { items: page.items.map(apiSerieToSerie), total: page.total, nextCursor: page.nextCursor };
}

/** Todas as páginas de `/v2/series` (A–Z). */
async function listAllSeries(featured: boolean): Promise<SerieListItem[]> {
  const out: SerieListItem[] = [];
  let cursor: string | null = null;
  do {
    const page: ApiPage<ApiSerie> = await api("/v2/series", {
      query: { featured: featured ? true : undefined, cursor, limit: 100 },
    });
    out.push(...page.items.map(apiSerieToSerie));
    cursor = page.nextCursor;
  } while (cursor);
  return out;
}

/** Séries (com `carCount`); `featured` = as em destaque da Home. */
export async function listSeries(options: { featured?: boolean } = {}): Promise<SerieListItem[]> {
  return listAllSeries(Boolean(options.featured));
}

/** Mantida por compatibilidade. */
export async function listFeaturedSeries(): Promise<Serie[]> {
  return listSeries({ featured: true });
}

/** Uma série pelo id; `null` quando não existe (404). */
export async function getSerie(id: string): Promise<SerieListItem | null> {
  try {
    return apiSerieToSerie(await api<ApiSerie>(`/v2/series/${encodeURIComponent(id)}`));
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

/** `carCount` por série (id → total). */
export async function getSeriesCarCount(): Promise<Record<string, number>> {
  const all = await listAllSeries(false);
  const map: Record<string, number> = {};
  for (const s of all) map[s.id] = s.carCount;
  return map;
}

/* ================================================================== */
/*                         MARCAS E ATRIBUTOS                           */
/* ================================================================== */

export async function listBrands(): Promise<Brand[]> {
  const brands = await api<ApiBrand[]>("/v2/brands");
  return brands.map(apiBrandToBrand).sort((a, b) => a.name.localeCompare(b.name));
}

export async function listAttributes(): Promise<Attribute[]> {
  const attrs = await api<Attribute[]>("/v2/attributes");
  return attrs
    .map((a) => ({ id: a.id, title: a.title, description: a.description ?? "" }))
    .sort((a, b) => a.title.localeCompare(b.title));
}
