/**
 * Migração do CATÁLOGO: Postgres do VPS (SOMENTE LEITURA) → Appwrite.
 * Sem imagens (imageFileId fica null; as fotos sobem depois, da pasta
 * local, por scripts/upload-images.mjs casando por sourceImagePath).
 *
 * Idempotente e retomável:
 * - IDs determinísticos (uuid da origem; slug para marcas) + upsertRows;
 * - checkpoint em backend/.state/migration.json (último id por fase);
 * - relatórios em backend/.state/report-*.csv.
 *
 *   npm run migrate -- --phase=all            (brands, attributes, series, cars, meta, verify)
 *   npm run migrate -- --phase=cars --restart (ignora o checkpoint da fase)
 *   npm run migrate -- --dry-run
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { Query } from "node-appwrite";
import { tablesDB, functions, DATABASE_ID, sleep } from "../lib/appwrite.mjs";
import { translateColor } from "../lib/colors.mjs";
import { pauseCatalogSync } from "../lib/catalog-sync.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const stateDir = path.join(root, ".state");
const statePath = path.join(stateDir, "migration.json");
mkdirSync(stateDir, { recursive: true });

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("=");
  return [k, v ?? true];
}));
const PHASES = ["brands", "attributes", "series", "cars", "meta", "verify"];
const phases = !args.phase || args.phase === "all" ? PHASES : String(args.phase).split(",");
const dryRun = Boolean(args["dry-run"]);
const BATCH = 100;

const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : {};
const saveState = () => writeFileSync(statePath, JSON.stringify(state, null, 2));

const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
function writeCsv(name, header, rows) {
  const file = path.join(stateDir, `report-${name}.csv`);
  writeFileSync(file, [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n") + "\n");
  console.log(`  relatório: .state/report-${name}.csv (${rows.length} linhas)`);
}

const env = process.env;
const pgClient = new pg.Client({
  host: env.SOURCE_PG_HOST,
  port: Number(env.SOURCE_PG_PORT),
  database: env.SOURCE_PG_DATABASE,
  user: env.SOURCE_PG_USER,
  password: env.SOURCE_PG_PASSWORD,
  // Garantia extra: o próprio servidor recusa qualquer escrita nesta sessão.
  options: "-c default_transaction_read_only=on",
});
await pgClient.connect();
const sql = async (text, params) => (await pgClient.query(text, params)).rows;

export const brandSlug = (name) =>
  name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const searchText = (...parts) =>
  parts.filter(Boolean).join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** Remove espaços invisíveis (U+200B etc.) que vieram colados em vários campos. */
const clean = (v) => (v ?? "").replace(/[\u200B-\u200D\u2060\uFEFF]/g, "").trim();

const iso = (d) => (d ? new Date(d).toISOString() : null);

async function upsertBatch(tableId, rows) {
  if (dryRun || rows.length === 0) return;
  for (let attempt = 1; ; attempt++) {
    try {
      await tablesDB.upsertRows({ databaseId: DATABASE_ID, tableId, rows });
      return;
    } catch (err) {
      if (attempt >= 5 || (err.code && err.code < 500 && err.code !== 429)) throw err;
      await sleep(1000 * attempt);
    }
  }
}


// ---------- fases ----------

async function migrateBrands() {
  const rows = await sql(`select brand, count(*)::int n from cars group by brand order by brand`);
  const data = rows.map((r) => ({ $id: brandSlug(r.brand), name: r.brand, state: "ativa", active: true, carCount: r.n }));
  await upsertBatch("brands", data);
  console.log(`  ${data.length} marcas: ${data.map((b) => `${b.name} (${b.$id})`).join(", ")}`);
}

async function migrateAttributes() {
  const rows = await sql(`select id, attribute, description from attributes order by id`);
  await upsertBatch("attributes", rows.map((r) => ({ $id: r.id, title: r.attribute ?? "", description: r.description ?? "" })));
  console.log(`  ${rows.length} atributos`);
}

async function migrateSeries() {
  const rows = await sql(`select s.id, s.name, s.description, s.is_default, count(c.id)::int n
    from series s left join cars c on c.serie_id = s.id group by s.id order by s.id`);
  for (let i = 0; i < rows.length; i += BATCH) {
    await upsertBatch("series", rows.slice(i, i + BATCH).map((r) => ({
      $id: r.id, title: r.name, description: r.description ?? "", isDefault: r.is_default, carCount: r.n,
    })));
  }
  console.log(`  ${rows.length} séries (${rows.filter((r) => r.is_default).length} destaques)`);
}

async function migrateCars() {
  const series = new Map((await sql(`select id, name from series`)).map((s) => [s.id, s.name]));
  const attrsByCar = new Map();
  for (const link of await sql(`select car_id, attribute_id from car_attributes order by car_id, attribute_id`)) {
    if (!attrsByCar.has(link.car_id)) attrsByCar.set(link.car_id, []);
    attrsByCar.get(link.car_id).push(link.attribute_id);
  }

  const phaseState = (state.cars ??= { lastId: null, done: 0 });
  if (args.restart) Object.assign(phaseState, { lastId: null, done: 0 });
  const colorReport = new Map();
  const issues = [];

  for (;;) {
    const batch = await sql(
      `select * from cars ${phaseState.lastId ? "where id > $1" : ""} order by id limit ${BATCH}`,
      phaseState.lastId ? [phaseState.lastId] : []
    );
    if (batch.length === 0) break;

    const rows = batch.map((c) => {
      const color = translateColor(clean(c.color_model));
      const key = `${c.color_model ?? ""}→${color.value}|${color.rule}`;
      colorReport.set(key, (colorReport.get(key) ?? 0) + 1);

      const rawPosition = clean(c.serie);
      const positionMatch = rawPosition.match(/^(\d+)\s*\/\s*(\d+)$/);
      const position = positionMatch ? `${positionMatch[1]}/${positionMatch[2]}` : null;
      if (rawPosition && !positionMatch) issues.push([c.id, c.name, `posição na série inválida: ${rawPosition}`]);
      const toy = clean(c.toy);
      const collector = clean(c.collector);
      if (!toy) issues.push([c.id, c.name, "toy vazio"]);
      if (!c.imagem_full) issues.push([c.id, c.name, "sem imagem na origem"]);

      return {
        $id: c.id,
        title: clean(c.name),
        description: c.description ?? "",
        brandId: brandSlug(c.brand),
        brandName: c.brand,
        serieId: c.serie_id,
        serieTitle: series.get(c.serie_id) ?? "",
        seriePosition: position,
        seriePositionNum: positionMatch ? Number(positionMatch[1]) : null,
        collector,
        color: color.value,
        toy,
        year: Number(c.year),
        scale: c.scale ?? "",
        // imageFileId fica de fora: rodar de novo não desfaz o vínculo das fotos.
        attributeIds: attrsByCar.get(c.id) ?? [],
        searchText: searchText(clean(c.name), toy, collector),
        sourceImagePath: c.imagem_full ?? null,
        sourceCreatedAt: iso(c.created_at),
        sourceUpdatedAt: iso(c.updated_at),
      };
    });

    await upsertBatch("cars", rows);
    phaseState.lastId = batch[batch.length - 1].id;
    phaseState.done += batch.length;
    if (!dryRun) saveState();
    process.stdout.write(`\r  carros: ${phaseState.done}`);
  }
  console.log("");

  const colorRows = [...colorReport].map(([k, n]) => {
    const [pair, rule] = k.split("|");
    const [from, to] = pair.split("→");
    return [from, to, rule, n];
  }).sort((a, b) => b[3] - a[3]);
  writeCsv("cores", ["origem", "destino", "regra", "carros"], colorRows);
  writeCsv("carros-avisos", ["carId", "titulo", "aviso"], issues);
}

/** catalog_meta e contagens: roda a Function catalog-sync (recontagem completa). */
async function refreshMeta() {
  if (dryRun) return;
  const exec = await functions.createExecution({ functionId: "catalog-sync", async: true });
  for (let i = 0; i < 150; i++) {
    const e = await functions.getExecution({ functionId: "catalog-sync", executionId: exec.$id });
    if (e.status === "completed") {
      console.log(`  catalog-sync concluída em ${e.duration.toFixed(1)} s: ${e.responseBody}`);
      return;
    }
    if (e.status === "failed") throw new Error(`catalog-sync falhou: ${e.errors || e.logs}`);
    await sleep(2000);
  }
  throw new Error("catalog-sync não terminou em 5 min");
}

/** Conta todas as linhas de uma tabela por cursor (o `total` para em 5.000). */
async function countAll(tableId, queries = []) {
  let n = 0;
  let cursor = null;
  for (;;) {
    const page = await tablesDB.listRows({
      databaseId: DATABASE_ID, tableId, total: false,
      queries: [...queries, Query.select(["$id"]), Query.limit(1000), Query.orderAsc("$id"), ...(cursor ? [Query.cursorAfter(cursor)] : [])],
    });
    n += page.rows.length;
    if (page.rows.length < 1000) return n;
    cursor = page.rows[page.rows.length - 1].$id;
  }
}

async function verify() {
  const [src] = await sql(`select
    (select count(*) from cars)::int cars, (select count(*) from series)::int series,
    (select count(*) from attributes)::int attributes, (select count(distinct brand) from cars)::int brands,
    (select count(*) from car_attributes)::int links, (select count(*) from cars where imagem_full is not null)::int with_image_path`);
  const dst = {
    cars: await countAll("cars"),
    series: await countAll("series"),
    attributes: await countAll("attributes"),
    brands: await countAll("brands"),
    with_image_path: await countAll("cars", [Query.isNotNull("sourceImagePath")]),
  };
  // Ligações: soma do tamanho de attributeIds.
  let links = 0;
  let cursor = null;
  for (;;) {
    const page = await tablesDB.listRows({
      databaseId: DATABASE_ID, tableId: "cars", total: false,
      queries: [Query.select(["$id", "attributeIds"]), Query.limit(1000), Query.orderAsc("$id"), ...(cursor ? [Query.cursorAfter(cursor)] : [])],
    });
    links += page.rows.reduce((s, r) => s + (r.attributeIds?.length ?? 0), 0);
    if (page.rows.length < 1000) break;
    cursor = page.rows[page.rows.length - 1].$id;
  }
  dst.links = links;

  const rows = Object.keys(src).map((k) => [k, src[k], dst[k], src[k] === dst[k] ? "OK" : "DIVERGE"]);
  console.table(rows.map(([item, origem, destino, status]) => ({ item, origem, destino, status })));

  // Amostra campo a campo.
  const sample = await sql(`select id, name, year, toy, serie_id from cars order by random() limit 50`);
  const mismatches = [];
  for (const s of sample) {
    const row = await tablesDB.getRow({ databaseId: DATABASE_ID, tableId: "cars", rowId: s.id }).catch(() => null);
    if (!row) mismatches.push([s.id, "ausente"]);
    else if (row.title !== clean(s.name) || row.year !== Number(s.year) || row.toy !== clean(s.toy) || row.serieId !== s.serie_id) {
      mismatches.push([s.id, "campos divergentes"]);
    }
  }
  console.log(`  amostra de 50 carros: ${50 - mismatches.length} conferem`);
  writeCsv("verificacao", ["item", "origem", "destino", "status"], rows);
  if (mismatches.length) writeCsv("verificacao-amostra", ["carId", "problema"], mismatches);
  state.verify = { at: new Date().toISOString(), src, dst, sampleMismatches: mismatches.length };
  saveState();
}

// ---------- execução ----------

const RUNNERS = { brands: migrateBrands, attributes: migrateAttributes, series: migrateSeries, cars: migrateCars, meta: refreshMeta, verify };

console.log(`Migração${dryRun ? " (DRY-RUN)" : ""}: ${phases.join(", ")}`);
let syncDisabled = false;
try {
  for (const phase of phases) {
    const loads = ["brands", "series", "cars"].includes(phase);
    if (loads && !syncDisabled) {
      await pauseCatalogSync(true);
      syncDisabled = true;
    }
    // A recontagem roda na própria catalog-sync: precisa estar ligada.
    if (!loads && syncDisabled) {
      await pauseCatalogSync(false);
      syncDisabled = false;
    }
    console.log(`\n# ${phase}`);
    await RUNNERS[phase]();
  }
} finally {
  if (syncDisabled) await pauseCatalogSync(false);
  await pgClient.end();
}
