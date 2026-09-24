import type { Models } from "react-native-appwrite";
import { tablesDb, APPWRITE_DATABASE_ID, withServiceError, Query } from "./_appwrite";
import { getCatalogTotalCars, getSeriesByIds, type SerieWithCount } from "./catalog";
import { getCollectionSummary } from "./collection";
import type { CollectionSummary } from "@/types";

/**
 * Estatísticas da coleção (`docs/design/telas/11-estatisticas.md`) e
 * posse por série (`10-series.md`). Tudo vem de contadores mantidos no
 * servidor pela Function `collection` — nada lê a coleção inteira:
 *
 * - `user_stats` → unidades, modelos, repetidos;
 * - `catalog_meta.totalCars` → base do "% do catálogo";
 * - `user_series_stats.owned` + `series.carCount` → progresso por série;
 * - `user_year_stats.owned` + `year_counts.carCount` → progresso por ano.
 *
 * A row security já restringe `user_*_stats` ao usuário logado.
 */

const TABLE = {
  userSeriesStats: "user_series_stats",
  userYearStats: "user_year_stats",
  yearCounts: "year_counts",
} as const;

interface UserSeriesStatsRow extends Models.Row {
  userId: string;
  serieId: string;
  owned: number;
}

interface UserYearStatsRow extends Models.Row {
  userId: string;
  year: number;
  owned: number;
}

interface YearCountRow extends Models.Row {
  year: number;
  carCount: number;
}

/** Lê todas as páginas (100 por vez) de uma consulta. */
async function listAll<Row extends Models.Row>(
  tableId: string,
  queries: string[]
): Promise<Row[]> {
  const out: Row[] = [];
  let cursor: string | null = null;
  for (;;) {
    const q = [...queries, Query.limit(100)];
    if (cursor) q.push(Query.cursorAfter(cursor));
    const result = await withServiceError(() =>
      tablesDb.listRows<Row>({
        databaseId: APPWRITE_DATABASE_ID,
        tableId,
        queries: q,
        total: false,
      })
    );
    const page = result.rows ?? [];
    out.push(...page);
    if (page.length < 100) break;
    cursor = page[page.length - 1].$id;
  }
  return out;
}

export type StatsSummary = CollectionSummary & {
  /** Total de carros do catálogo (base do "% do catálogo"). */
  catalogTotal: number;
};

export async function getStatsSummary(): Promise<StatsSummary> {
  const [summary, catalogTotal] = await Promise.all([
    getCollectionSummary(),
    getCatalogTotalCars(),
  ]);
  return { ...summary, catalogTotal };
}

export type SerieProgress = {
  serie: SerieWithCount;
  owned: number;
  total: number;
};

/** Séries começadas (owned ≥ 1), sem ordem definida (a tela ordena). */
export async function getSeriesProgress(): Promise<SerieProgress[]> {
  const rows = await listAll<UserSeriesStatsRow>(TABLE.userSeriesStats, [
    Query.greaterThan("owned", 0),
  ]);
  if (rows.length === 0) return [];
  const ownedById = new Map(rows.map((r) => [r.serieId, r.owned]));
  const series = await getSeriesByIds([...ownedById.keys()]);
  return series.map((serie) => ({
    serie,
    owned: ownedById.get(serie.id) ?? 0,
    total: serie.carCount,
  }));
}

export type YearProgress = { year: number; owned: number; total: number };

/** Anos com posse, do mais novo para o mais antigo. */
export async function getYearProgress(): Promise<YearProgress[]> {
  const owned = await listAll<UserYearStatsRow>(TABLE.userYearStats, [
    Query.greaterThan("owned", 0),
  ]);
  if (owned.length === 0) return [];
  // `year_counts` só dos anos com posse ($id = "y<ano>").
  const counts = await listAll<YearCountRow>(TABLE.yearCounts, [
    Query.equal("$id", owned.map((r) => `y${r.year}`)),
  ]);
  const totalByYear = new Map(counts.map((r) => [r.year, r.carCount]));
  return owned
    .map((r) => ({ year: r.year, owned: r.owned, total: totalByYear.get(r.year) ?? r.owned }))
    .sort((a, b) => b.year - a.year);
}
