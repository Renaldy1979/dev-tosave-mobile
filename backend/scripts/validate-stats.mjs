/**
 * Validação das telas Séries e Estatísticas com um usuário de TESTE
 * (criado aqui e apagado no fim; a coleção real não é tocada).
 *
 * Cobre: Function collection mantendo user_series_stats/user_year_stats
 * (+1/-1 por modelo, sem contar quantity, pct), Function serie-progress
 * (Todos / Na coleção / Faltam, paginação e contagens), busca de séries
 * por contains, year_counts e catalog_meta legíveis, escrita direta
 * recusada e user-cleanup apagando as tabelas novas.
 *
 *   npm run validate-stats
 */
import { randomBytes } from "node:crypto";
import { Client, Account, TablesDB, Functions, ID, Query, ExecutionMethod } from "node-appwrite";
import { users, tablesDB as adminDb, DATABASE_ID, sleep } from "../lib/appwrite.mjs";
import { serieStatsRowId, yearStatsRowId, seriePct } from "../functions/collection/src/main.js";

const { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY } = process.env;
const results = [];
function check(label, ok, detail = "") {
  results.push({ teste: label, resultado: ok ? "OK" : "FALHOU", detalhe: String(detail).slice(0, 90) });
  if (!ok) process.exitCode = 1;
}

const email = `alicerce-teste-stats-${Date.now()}@tosave.test`;
const password = randomBytes(12).toString("base64url");
const user = await users.create({ userId: ID.unique(), email, password, name: "Teste estatísticas" });

try {
  const adminAccount = new Account(new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY));
  const session = await adminAccount.createEmailPasswordSession({ email, password });
  const client = new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setSession(session.secret);
  const db = new TablesDB(client);
  const fn = new Functions(client);
  const exec = async (functionId, body) => {
    const e = await fn.createExecution({ functionId, body: JSON.stringify(body), async: false, method: ExecutionMethod.POST, headers: { "content-type": "application/json" } });
    return { status: e.responseStatusCode, body: JSON.parse(e.responseBody || "{}"), ms: Math.round(e.duration * 1000) };
  };

  // Série pequena para o teste (5 a 12 carros), com carros de pelo menos 2 anos.
  const series = (await db.listRows({ databaseId: DATABASE_ID, tableId: "series", queries: [Query.between("carCount", 5, 12), Query.limit(50)] })).rows;
  let serie = null;
  let cars = [];
  for (const s of series) {
    const c = (await db.listRows({ databaseId: DATABASE_ID, tableId: "cars", queries: [Query.equal("serieId", s.$id), Query.limit(20)] })).rows;
    if (new Set(c.map((x) => x.year)).size >= 2) { serie = s; cars = c; break; }
  }
  check("série de teste encontrada", Boolean(serie), serie ? `${serie.title} (${serie.carCount} carros)` : "");
  const [carA, carB] = [cars[0], cars.find((c) => c.year !== cars[0].year)];

  const readSerie = () => db.getRow({ databaseId: DATABASE_ID, tableId: "user_series_stats", rowId: serieStatsRowId(user.$id, serie.$id) }).catch(() => null);
  const readYear = (y) => db.getRow({ databaseId: DATABASE_ID, tableId: "user_year_stats", rowId: yearStatsRowId(user.$id, y) }).catch(() => null);

  let r = await exec("collection", { action: "add", carId: carA.$id });
  let s = await readSerie();
  check("add A → série owned 1, pct certo", s?.owned === 1 && s.pct === seriePct(1, serie.carCount) && s.serieCarCount === serie.carCount, `pct=${s?.pct} (${r.ms} ms)`);
  check("add A → ano owned 1", (await readYear(carA.year))?.owned === 1, carA.year);

  await exec("collection", { action: "add", carId: carA.$id });
  s = await readSerie();
  check("add A de novo (qty 2) → série continua 1", s?.owned === 1, `owned=${s?.owned}`);

  await exec("collection", { action: "add", carId: carB.$id });
  s = await readSerie();
  check("add B (outro ano) → série 2, dois anos com 1", s?.owned === 2 && (await readYear(carA.year))?.owned === 1 && (await readYear(carB.year))?.owned === 1, `pct=${s?.pct}`);

  // serie-progress
  let p = await exec("serie-progress", { serieId: serie.$id, filter: "all", pageSize: 3 });
  check("serie-progress Todos: contagens", p.status === 200 && p.body.counts.total === serie.carCount && p.body.counts.owned === 2 && p.body.counts.missing === serie.carCount - 2, JSON.stringify(p.body.counts) + ` ${p.ms} ms`);
  const page2 = await exec("serie-progress", { serieId: serie.$id, filter: "all", pageSize: 3, cursor: p.body.nextCursor });
  const overlap = page2.body.items.filter((x) => p.body.items.some((y) => y.id === x.id)).length;
  check("serie-progress página 2 por cursor, sem repetir", page2.body.items.length > 0 && overlap === 0, `${page2.body.items.length} itens`);
  p = await exec("serie-progress", { serieId: serie.$id, filter: "owned" });
  check("serie-progress Na coleção = A e B", p.body.items.length === 2 && p.body.items.every((x) => x.owned) && p.body.items.find((x) => x.id === carA.$id)?.quantity === 2);
  p = await exec("serie-progress", { serieId: serie.$id, filter: "missing", pageSize: 100 });
  check("serie-progress Faltam = total − 2, nenhum possuído", p.body.items.length === serie.carCount - 2 && p.body.items.every((x) => !x.owned));
  const bad = await exec("serie-progress", { filter: "all" });
  check("serie-progress sem serieId → 400", bad.status === 400);

  // remover A por completo → série 1, ano de A 0
  await exec("collection", { action: "remove", carId: carA.$id });
  s = await readSerie();
  check("remove A → série 1, ano de A 0", s?.owned === 1 && (await readYear(carA.year))?.owned === 0, `pct=${s?.pct}`);

  // leituras do app
  const byPct = await db.listRows({ databaseId: DATABASE_ID, tableId: "user_series_stats", queries: [Query.equal("userId", user.$id), Query.greaterThan("owned", 0), Query.orderDesc("pct"), Query.orderDesc("owned"), Query.limit(20)] });
  check("progresso por série ordenado por % (dono lê)", byPct.total === 1, `${byPct.total} série`);
  const years = await db.listRows({ databaseId: DATABASE_ID, tableId: "user_year_stats", queries: [Query.equal("userId", user.$id), Query.greaterThan("owned", 0)] });
  const yc = await db.getRow({ databaseId: DATABASE_ID, tableId: "year_counts", rowId: `y${carB.year}` });
  check("anos com owned>0 + year_counts legível", years.total === 1 && yc.carCount > 0, `${carB.year}: 1/${yc.carCount}`);
  const meta = await db.getRow({ databaseId: DATABASE_ID, tableId: "catalog_meta", rowId: "global" });
  check("catalog_meta.totalCars legível", meta.totalCars > 0, meta.totalCars);
  const found = await db.listRows({ databaseId: DATABASE_ID, tableId: "series", queries: [Query.contains("title", "j-imp"), Query.limit(5)] });
  check("busca de séries por trecho ('j-imp')", found.rows.some((x) => x.title === "HW J-Imports"), found.rows.map((x) => x.title).join(", "));

  const direct = await db.createRow({ databaseId: DATABASE_ID, tableId: "user_series_stats", rowId: ID.unique(), data: { userId: user.$id, serieId: serie.$id, owned: 99 } })
    .then(() => "gravou").catch((e) => e.code);
  check("app NÃO grava direto em user_series_stats", direct === 401, direct);

  // apagar → user-cleanup limpa as tabelas novas
  await users.delete({ userId: user.$id });
  let left = null;
  for (let i = 0; i < 40; i++) {
    await sleep(3000);
    const counts = await Promise.all(["collection_items", "user_series_stats", "user_year_stats"].map((t) =>
      adminDb.listRows({ databaseId: DATABASE_ID, tableId: t, queries: [Query.equal("userId", user.$id), Query.limit(1)] }).then((x) => x.total)));
    left = counts;
    if (counts.every((n) => n === 0)) break;
  }
  check("user-cleanup apagou coleção e estatísticas novas", left.every((n) => n === 0), JSON.stringify(left));
} catch (err) {
  check("execução", false, err.message);
} finally {
  await users.delete({ userId: user.$id }).catch(() => {});
  console.table(results);
}
