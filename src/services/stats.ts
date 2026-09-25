import { serieLogoUrl } from "./_appwrite";
import { api } from "./_http";
import type { SerieWithCount } from "./catalog";
import type { CollectionSummary } from "@/types";

/**
 * Estatísticas da coleção (`docs/design/telas/11-estatisticas.md`) —
 * backend próprio, rotas `/v2/stats`, contadas por SQL no servidor.
 */

export type StatsSummary = CollectionSummary & {
  /** Total de carros do catálogo (base do "% do catálogo"). */
  catalogTotal: number;
};

export async function getStatsSummary(): Promise<StatsSummary> {
  const s = await api<StatsSummary & { catalogPct?: number }>("/v2/stats/summary");
  return {
    totalItems: s.totalItems,
    totalModels: s.totalModels,
    duplicates: s.duplicates,
    catalogTotal: s.catalogTotal,
  };
}

export type SerieProgress = {
  serie: SerieWithCount;
  owned: number;
  total: number;
};

type ApiSerieProgress = {
  serieId: string;
  title: string;
  imageFileId: string | null;
  owned: number;
  carCount: number;
  pct: number;
  complete: boolean;
};

/** Séries começadas (owned ≥ 1). A tela ordena (Maior % ou Nome). */
export async function getSeriesProgress(): Promise<SerieProgress[]> {
  const rows = await api<ApiSerieProgress[]>("/v2/stats/series", { query: { sort: "pct" } });
  return rows.map((r) => ({
    serie: {
      id: r.serieId,
      title: r.title,
      description: "",
      imagem: serieLogoUrl(r.imageFileId),
      isDefault: false,
      createdAt: "",
      carCount: r.carCount,
    },
    owned: r.owned,
    total: r.carCount,
  }));
}

export type YearProgress = { year: number; owned: number; total: number };

/** Anos com posse, do mais novo para o mais antigo. */
export async function getYearProgress(): Promise<YearProgress[]> {
  const rows = await api<{ year: number; owned: number; carCount: number; pct: number }[]>("/v2/stats/years");
  return rows.map((r) => ({ year: r.year, owned: r.owned, total: r.carCount }));
}
