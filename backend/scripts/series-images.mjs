/**
 * Imagens das séries: pasta LOCAL (somente leitura) → bucket `car-images`.
 *
 * Regra do usuário: casamento EXATO entre o nome do arquivo na pasta e
 * `series.picture` da origem (Postgres, somente leitura). Sem
 * normalização e sem candidatos aproximados: quem não casa fica sem imagem.
 *
 * Depois grava `series.imageFileId` e deixa em destaque (isDefault=true)
 * SOMENTE as séries com foto; as demais ficam isDefault=false.
 * A lista de destaques anterior fica em .state/series-destaques-antes.json
 * (não é sobrescrita se já existir) para poder desfazer.
 *
 *   npm run series-images -- --dir="C:\...\base_series" [--dry-run]
 */
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { Query } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { tablesDB, storage, DATABASE_ID, BUCKET_ID, isNotFound } from "../lib/appwrite.mjs";
import { pauseCatalogSync } from "../lib/catalog-sync.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const i = a.indexOf("=");
  return i < 0 ? [a.replace(/^--/, ""), true] : [a.slice(2, i), a.slice(i + 1)];
}));
const dir = args.dir;
const dryRun = Boolean(args["dry-run"]);
if (!dir || !existsSync(dir)) {
  console.error("Informe --dir=<pasta das imagens das séries>");
  process.exit(1);
}

const PREVIEWS = [
  { width: 400, height: 0, quality: 75, output: "webp" },
  { width: 1080, height: 0, quality: 85, output: "webp" },
];
const seriesFileId = (serieId) => `s_${serieId.replace(/-/g, "")}`;

// ---------- origem: series.picture ----------
const env = process.env;
const pgClient = new pg.Client({
  host: env.SOURCE_PG_HOST, port: Number(env.SOURCE_PG_PORT), database: env.SOURCE_PG_DATABASE,
  user: env.SOURCE_PG_USER, password: env.SOURCE_PG_PASSWORD,
  options: "-c default_transaction_read_only=on",
});
await pgClient.connect();
const pictures = (await pgClient.query(
  `select id, name, picture from series where coalesce(trim(picture), '') <> '' order by name`
)).rows;
await pgClient.end();

// ---------- casamento exato ----------
const files = readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
const fileSet = new Set(files);
const matched = pictures.filter((p) => fileSet.has(p.picture));
const matchedFiles = new Set(matched.map((m) => m.picture));
const seriesWithoutFile = pictures.filter((p) => !fileSet.has(p.picture));
const filesWithoutSerie = files.filter((f) => !matchedFiles.has(f));

console.log(`Pasta: ${dir}${dryRun ? "  (DRY-RUN)" : ""}`);
console.log(`\nCasaram (${matched.length}):`);
for (const m of matched) console.log(`  ${m.picture} → ${m.name} [${m.id}]`);
console.log(`\nArquivos sem série (${filesWithoutSerie.length}): ${filesWithoutSerie.join(", ")}`);
console.log(`Séries com picture sem arquivo (${seriesWithoutFile.length}): ${seriesWithoutFile.map((s) => `${s.name}=${s.picture}`).join(", ")}`);

// ---------- estado atual no Appwrite ----------
const series = (await tablesDB.listRows({ databaseId: DATABASE_ID, tableId: "series", queries: [Query.limit(1000)] })).rows;
const withPhoto = new Set(matched.map((m) => m.id));
const before = series.filter((s) => s.isDefault).map((s) => s.title).sort();
const after = series.filter((s) => withPhoto.has(s.$id)).map((s) => s.title).sort();
console.log(`\nDestaques antes (${before.length}): ${before.join(", ")}`);
console.log(`Destaques depois (${after.length}): ${after.join(", ")}`);

const snapshotPath = path.join(root, ".state", "series-destaques-antes.json");
if (!existsSync(snapshotPath)) {
  writeFileSync(snapshotPath, JSON.stringify({
    at: new Date().toISOString(),
    destaques: series.filter((s) => s.isDefault).map((s) => ({ id: s.$id, title: s.title, imageFileId: s.imageFileId ?? null })),
  }, null, 2));
}
if (dryRun) process.exit(0);

// ---------- aplicar ----------
await pauseCatalogSync(true);
try {
  for (const m of matched) {
    const fileId = seriesFileId(m.id);
    try {
      await storage.getFile({ bucketId: BUCKET_ID, fileId });
    } catch (err) {
      if (!isNotFound(err)) throw err;
      await storage.createFile({ bucketId: BUCKET_ID, fileId, file: InputFile.fromPath(path.join(dir, m.picture), m.picture) });
    }
    for (const p of PREVIEWS) {
      const url = new URL(`${env.APPWRITE_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${fileId}/preview`);
      for (const [k, v] of Object.entries(p)) url.searchParams.set(k, String(v));
      url.searchParams.set("project", env.APPWRITE_PROJECT_ID);
      await fetch(url).then((r) => r.arrayBuffer());
    }
  }
  let changed = 0;
  for (const s of series) {
    const data = {
      imageFileId: withPhoto.has(s.$id) ? seriesFileId(s.$id) : (s.imageFileId ?? null),
      isDefault: withPhoto.has(s.$id),
    };
    if (data.imageFileId !== (s.imageFileId ?? null) || data.isDefault !== s.isDefault) {
      await tablesDB.updateRow({ databaseId: DATABASE_ID, tableId: "series", rowId: s.$id, data });
      changed++;
    }
  }
  console.log(`\nAplicado: ${matched.length} imagens no bucket, ${changed} séries atualizadas.`);
} finally {
  await pauseCatalogSync(false);
}
