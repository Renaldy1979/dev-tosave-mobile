/**
 * Function `catalog-sync` — mantém os derivados do catálogo:
 * - `series.carCount` e `brands.carCount`;
 * - `catalog_meta` (totalCars, years) e `year_counts` (carros por ano);
 * - campos desnormalizados em `cars` (brandName, serieTitle) e em
 *   `collection_items` (car*, brandName, serieTitle).
 *
 * Gatilhos:
 * - eventos de linha em cars/series/brands (edição pelo portal);
 * - agenda diária: recontagem completa (rede de segurança — o evento de
 *   update não traz o valor antigo, ex.: carro que mudou de série).
 *
 * Toda escrita só acontece quando o valor muda, o que evita laço de
 * eventos (esta Function escreve em tabelas que também a disparam).
 */
import { Client, TablesDB, Query } from "node-appwrite";

const DATABASE_ID = "tosave";

/** Corpo JSON da requisição; `{}` quando vazio ou inválido (o getter bodyJson lança). */
function readJson(req) {
  try {
    const parsed = JSON.parse(req.bodyText || req.body || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
const PAGE = 1000;

function makeDb(req) {
  const client = new Client()
    .setEndpoint(process.env.TOSAVE_ENDPOINT || process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers["x-appwrite-key"]);
  return new TablesDB(client);
}

/** Percorre uma tabela inteira por cursor. */
async function* scan(db, tableId, queries = []) {
  let cursor = null;
  for (;;) {
    const page = await db.listRows({
      databaseId: DATABASE_ID, tableId, total: false,
      queries: [...queries, Query.limit(PAGE), Query.orderAsc("$id"), ...(cursor ? [Query.cursorAfter(cursor)] : [])],
    });
    yield* page.rows;
    if (page.rows.length < PAGE) return;
    cursor = page.rows[page.rows.length - 1].$id;
  }
}

async function updateIfChanged(db, tableId, row, data) {
  const changed = Object.entries(data).some(([k, v]) => JSON.stringify(row[k]) !== JSON.stringify(v));
  if (changed) await db.updateRow({ databaseId: DATABASE_ID, tableId, rowId: row.$id, data });
  return changed;
}

/** Recontagem completa: contagens por série/marca e catalog_meta. */
async function fullRecount(db, log) {
  const bySerie = new Map();
  const byBrand = new Map();
  const byYear = new Map();
  let total = 0;
  for await (const car of scan(db, "cars", [Query.select(["$id", "serieId", "brandId", "year"])])) {
    total++;
    bySerie.set(car.serieId, (bySerie.get(car.serieId) ?? 0) + 1);
    byBrand.set(car.brandId, (byBrand.get(car.brandId) ?? 0) + 1);
    byYear.set(car.year, (byYear.get(car.year) ?? 0) + 1);
  }
  const years = new Set(byYear.keys());
  let changed = 0;
  const serieTitles = new Map();
  for await (const serie of scan(db, "series")) {
    serieTitles.set(serie.$id, serie.title);
    if (await updateIfChanged(db, "series", serie, { carCount: bySerie.get(serie.$id) ?? 0 })) changed++;
  }
  for await (const brand of scan(db, "brands")) {
    if (await updateIfChanged(db, "brands", brand, { carCount: byBrand.get(brand.$id) ?? 0 })) changed++;
  }
  await db.upsertRow({
    databaseId: DATABASE_ID, tableId: "catalog_meta", rowId: "global",
    data: { totalCars: total, years: [...years].sort((a, b) => b - a) },
  });
  // Total por ano (tela Estatísticas). Ano que ficou sem carros vai a 0.
  for await (const row of scan(db, "year_counts")) if (!byYear.has(row.year)) byYear.set(row.year, 0);
  for (const [year, carCount] of byYear) {
    if (await upsertYearCount(db, year, carCount)) changed++;
  }
  // Progresso dos usuários por série (serieCarCount/pct desnormalizados).
  let pctFixed = 0;
  for await (const stat of scan(db, "user_series_stats")) {
    if (await refreshSeriePct(db, stat, bySerie.get(stat.serieId) ?? 0, serieTitles.get(stat.serieId))) pctFixed++;
  }
  log(`recontagem: ${total} carros, ${changed} séries/marcas/anos corrigidos, ${pctFixed} progressos de série`);
}

/** Progresso da série em milésimos, travado em 1000 (igual à Function collection). */
const seriePct = (owned, carCount) => (carCount > 0 ? Math.min(1000, Math.round((owned * 1000) / carCount)) : 0);

/** Atualiza serieCarCount/pct/serieTitle de uma linha de user_series_stats, só se mudou. */
async function refreshSeriePct(db, stat, serieCarCount, serieTitle = stat.serieTitle) {
  const pct = seriePct(stat.owned, serieCarCount);
  if (stat.pct === pct && stat.serieCarCount === serieCarCount && stat.serieTitle === serieTitle) return false;
  await db.updateRow({ databaseId: DATABASE_ID, tableId: "user_series_stats", rowId: stat.$id, data: { pct, serieCarCount, serieTitle } });
  return true;
}

/** Grava year_counts/y<ano> só quando o valor muda. */
async function upsertYearCount(db, year, carCount) {
  const current = await db.getRow({ databaseId: DATABASE_ID, tableId: "year_counts", rowId: `y${year}` }).catch(() => null);
  if (current && current.carCount === carCount) return false;
  await db.upsertRow({ databaseId: DATABASE_ID, tableId: "year_counts", rowId: `y${year}`, data: { year, carCount } });
  return true;
}

async function countWhere(db, tableId, column, value) {
  const { total } = await db.listRows({ databaseId: DATABASE_ID, tableId, queries: [Query.equal(column, value), Query.limit(1)] });
  return total;
}

async function recountSerieAndBrand(db, serieId, brandId) {
  if (serieId) {
    const serie = await db.getRow({ databaseId: DATABASE_ID, tableId: "series", rowId: serieId }).catch(() => null);
    if (serie) {
      const carCount = await countWhere(db, "cars", "serieId", serieId);
      await updateIfChanged(db, "series", serie, { carCount });
      for await (const stat of scan(db, "user_series_stats", [Query.equal("serieId", serieId)])) {
        await refreshSeriePct(db, stat, carCount, serie.title);
      }
    }
  }
  if (brandId) {
    const brand = await db.getRow({ databaseId: DATABASE_ID, tableId: "brands", rowId: brandId }).catch(() => null);
    if (brand) await updateIfChanged(db, "brands", brand, { carCount: await countWhere(db, "cars", "brandId", brandId) });
  }
}

/** Copia campos para todas as linhas que casam `match` e ainda divergem. */
async function propagate(db, tableId, match, data) {
  const differs = Object.entries(data).map(([k, v]) => (v === null ? Query.isNotNull(k) : Query.notEqual(k, v)));
  const queries = [Query.equal(match[0], match[1]), ...(differs.length > 1 ? [Query.or(differs)] : differs)];
  const probe = await db.listRows({ databaseId: DATABASE_ID, tableId, queries: [...queries, Query.limit(1)], total: false });
  if (probe.rows.length === 0) return;
  await db.updateRows({ databaseId: DATABASE_ID, tableId, data, queries });
}

export default async ({ req, res, log }) => {
  const db = makeDb(req);
  const event = req.headers["x-appwrite-event"] ?? "";
  const row = readJson(req);

  // Agenda (sem evento) ou execução manual: recontagem completa.
  if (!event) {
    await fullRecount(db, log);
    return res.json({ ok: true, mode: "full" });
  }

  const [, , , tableId, , , action] = event.split(".");
  if (tableId === "cars") {
    await recountSerieAndBrand(db, row.serieId, row.brandId);
    // Ano do carro (o ano antigo, se mudou, é corrigido na agenda diária).
    if (row.year) await upsertYearCount(db, row.year, await countWhere(db, "cars", "year", row.year));
    if (action === "update") {
      await propagate(db, "collection_items", ["carId", row.$id], {
        carTitle: row.title, carToy: row.toy ?? "", carCollector: row.collector ?? "", carYear: row.year,
        carColor: row.color ?? "", carScale: row.scale ?? "", carSeriePosition: row.seriePosition ?? null,
        carImageFileId: row.imageFileId ?? null, brandId: row.brandId, serieId: row.serieId, searchText: row.searchText ?? "",
      });
    }
    if (action === "create" || action === "delete") await fullRecount(db, log);
  } else if (tableId === "series" && action === "update") {
    await propagate(db, "cars", ["serieId", row.$id], { serieTitle: row.title });
    await propagate(db, "collection_items", ["serieId", row.$id], { serieTitle: row.title });
    await propagate(db, "user_series_stats", ["serieId", row.$id], { serieTitle: row.title });
  } else if (tableId === "brands" && action === "update") {
    await propagate(db, "cars", ["brandId", row.$id], { brandName: row.name });
    await propagate(db, "collection_items", ["brandId", row.$id], { brandName: row.name });
  }
  return res.json({ ok: true, event });
};
