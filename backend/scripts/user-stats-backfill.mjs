/**
 * Backfill / reparo das estatísticas por SÉRIE e por ANO de um usuário
 * (tabelas user_series_stats e user_year_stats), a partir de collection_items.
 *
 * Só LÊ collection_items e user_stats; só ESCREVE nas duas tabelas novas.
 * Idempotente: grava o valor calculado (upsert com id determinístico, o
 * mesmo da Function `collection`) e zera linhas que não correspondem mais
 * a nenhum modelo. No fim confere: soma por série = soma por ano =
 * user_stats.totalModels.
 *
 *   npm run user-stats-backfill -- --user=<userId> [--dry-run]
 *   npm run user-stats-backfill -- --all [--dry-run]
 */
import { Permission, Role, Query } from "node-appwrite";
import { tablesDB, users, DATABASE_ID } from "../lib/appwrite.mjs";
import { serieStatsRowId, yearStatsRowId, seriePct } from "../functions/collection/src/main.js";

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("=");
  return [k, v ?? true];
}));
const dryRun = Boolean(args["dry-run"]);

async function listAll(tableId, queries) {
  const rows = [];
  let cursor = null;
  for (;;) {
    const page = await tablesDB.listRows({
      databaseId: DATABASE_ID, tableId, total: false,
      queries: [...queries, Query.limit(1000), Query.orderAsc("$id"), ...(cursor ? [Query.cursorAfter(cursor)] : [])],
    });
    rows.push(...page.rows);
    if (page.rows.length < 1000) return rows;
    cursor = page.rows.at(-1).$id;
  }
}

async function backfill(userId) {
  const items = await listAll("collection_items", [Query.equal("userId", userId), Query.select(["$id", "serieId", "carYear", "quantity"])]);
  const bySerie = new Map();
  const byYear = new Map();
  for (const it of items) {
    if (it.quantity < 1) continue;
    if (it.serieId) bySerie.set(it.serieId, (bySerie.get(it.serieId) ?? 0) + 1);
    if (it.carYear) byYear.set(it.carYear, (byYear.get(it.carYear) ?? 0) + 1);
  }
  const ownerRead = [Permission.read(Role.user(userId))];
  const carCount = (serieId) => seriesInfo.get(serieId)?.carCount ?? 0;
  const title = (serieId) => seriesInfo.get(serieId)?.title ?? "";
  const serieRows = [...bySerie].map(([serieId, owned]) => ({
    $id: serieStatsRowId(userId, serieId), $permissions: ownerRead, userId, serieId, owned,
    serieCarCount: carCount(serieId), pct: seriePct(owned, carCount(serieId)), serieTitle: title(serieId),
  }));
  const yearRows = [...byYear].map(([year, owned]) => ({ $id: yearStatsRowId(userId, year), $permissions: ownerRead, userId, year, owned }));

  // Linhas existentes que não correspondem mais a nenhum modelo: zerar.
  const existingSeries = await listAll("user_series_stats", [Query.equal("userId", userId)]);
  const existingYears = await listAll("user_year_stats", [Query.equal("userId", userId)]);
  for (const r of existingSeries) if (!bySerie.has(r.serieId) && r.owned !== 0) serieRows.push({ $id: r.$id, $permissions: ownerRead, userId, serieId: r.serieId, owned: 0, serieCarCount: carCount(r.serieId), pct: 0, serieTitle: title(r.serieId) });
  for (const r of existingYears) if (!byYear.has(r.year) && r.owned !== 0) yearRows.push({ $id: r.$id, $permissions: ownerRead, userId, year: r.year, owned: 0 });

  if (!dryRun) {
    for (let i = 0; i < serieRows.length; i += 100) await tablesDB.upsertRows({ databaseId: DATABASE_ID, tableId: "user_series_stats", rows: serieRows.slice(i, i + 100) });
    for (let i = 0; i < yearRows.length; i += 100) await tablesDB.upsertRows({ databaseId: DATABASE_ID, tableId: "user_year_stats", rows: yearRows.slice(i, i + 100) });
  }

  const stats = await tablesDB.getRow({ databaseId: DATABASE_ID, tableId: "user_stats", rowId: userId }).catch(() => null);
  const sumSerie = [...bySerie.values()].reduce((s, n) => s + n, 0);
  const sumYear = [...byYear.values()].reduce((s, n) => s + n, 0);
  const models = stats?.totalModels ?? 0;
  const ok = sumSerie === models && sumYear === models;
  console.log(`${userId}: ${bySerie.size} séries, ${byYear.size} anos | soma por série ${sumSerie}, por ano ${sumYear}, user_stats.totalModels ${models} → ${ok ? "OK" : "DIVERGE"}${dryRun ? " (dry-run)" : ""}`);
  if (!ok) process.exitCode = 1;
}

const seriesInfo = new Map(
  (await listAll("series", [Query.select(["$id", "carCount", "title"])])).map((s) => [s.$id, { carCount: s.carCount ?? 0, title: s.title }])
);

let targets;
if (args.user) targets = [String(args.user)];
else if (args.all) targets = (await users.list({ queries: [Query.limit(5000)] })).users.map((u) => u.$id);
else {
  console.error("Informe --user=<userId> ou --all");
  process.exit(1);
}
for (const userId of targets) await backfill(userId);
