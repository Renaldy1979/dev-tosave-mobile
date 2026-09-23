/**
 * Fotos dos carros: pasta LOCAL do usuário → bucket `car-images`.
 *
 * A pasta é SOMENTE LEITURA: o script só lista, faz stat e lê arquivos.
 * Nunca move, renomeia ou apaga nada nela.
 *
 * Casamento: nome do arquivo local = nome do arquivo em
 * cars.sourceImagePath (/tosave/cars/<hash>_<nome>.jpg). Arquivos
 * *_thumb.jpg são ignorados (thumbs saem do getFilePreview).
 *
 * Upload (sem --dry-run): fileId = uuid do carro sem hífens (idempotente:
 * se já existe, só garante o vínculo) → createFile → cars.imageFileId →
 * aquece as prévias usadas pelo app. A catalog-sync fica desligada
 * durante a carga (evita ~10 mil eventos); no fim o script propaga
 * carImageFileId para collection_items e religa a Function.
 * Checkpoint em .state/upload-images.json; relatórios em .state/.
 *
 *   npm run upload-images -- --dir="C:\...\_backup_fotos" --dry-run
 *   npm run upload-images -- --dir="C:\...\_backup_fotos" [--concurrency=4]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, openSync, readSync, closeSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Query } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { tablesDB, storage, DATABASE_ID, BUCKET_ID, isNotFound, sleep } from "../lib/appwrite.mjs";
import { pauseCatalogSync } from "../lib/catalog-sync.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const stateDir = path.join(root, ".state");
mkdirSync(stateDir, { recursive: true });
const statePath = path.join(stateDir, "upload-images.json");

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const i = a.indexOf("=");
  return i < 0 ? [a.replace(/^--/, ""), true] : [a.slice(2, i), a.slice(i + 1)];
}));
const dir = args.dir;
const dryRun = Boolean(args["dry-run"]);
const concurrency = Number(args.concurrency ?? 4);
const MAX_FILE_SIZE = 10 * 1024 * 1024; // igual ao bucket
if (!dir || !existsSync(dir)) {
  console.error("Informe --dir=<pasta das fotos> (existente)");
  process.exit(1);
}

/** Prévias usadas pelo app (mesmos parâmetros → mesmo cache no servidor). */
export const PREVIEWS = [
  { width: 400, height: 0, quality: 75, output: "webp" },
  { width: 1080, height: 0, quality: 85, output: "webp" },
];

const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
function writeCsv(name, header, rows) {
  writeFileSync(path.join(stateDir, `report-${name}.csv`), [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n") + "\n");
  console.log(`  relatório: .state/report-${name}.csv (${rows.length} linhas)`);
}
const mb = (bytes) => `${(bytes / 1048576).toFixed(1)} MB`;

/** Largura × altura lidas do cabeçalho JPEG (só leitura dos primeiros KB). */
function jpegSize(file) {
  const fd = openSync(file, "r");
  try {
    const buf = Buffer.alloc(65536);
    const n = readSync(fd, buf, 0, buf.length, 0);
    let i = 2;
    while (i < n - 9) {
      if (buf[i] !== 0xff) return null;
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
    return null;
  } finally {
    closeSync(fd);
  }
}

async function walk(folder, out = []) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const full = path.join(folder, entry.name);
    if (entry.isDirectory()) await walk(full, out);
    else out.push(full);
  }
  return out;
}

// ---------- 1. pasta local ----------
console.log(`Pasta: ${dir}${dryRun ? "  (DRY-RUN: nada será enviado)" : ""}`);
const all = await walk(dir);
const jpgs = all.filter((f) => /\.jpe?g$/i.test(f));
const thumbs = jpgs.filter((f) => /_thumb\.jpe?g$/i.test(f));
const originals = jpgs.filter((f) => !/_thumb\.jpe?g$/i.test(f));
const localByName = new Map();
// Reserva: nome sem extensão. A origem tem ~1 mil caminhos .jpeg/.png cujo
// arquivo local foi convertido para .jpg (mesmo hash e nome).
const localByStem = new Map();
const stem = (name) => name.toLowerCase().replace(/\.[a-z0-9]+$/, "");
const duplicateNames = [];
for (const f of originals) {
  const key = path.basename(f).toLowerCase();
  if (localByName.has(key)) duplicateNames.push([path.basename(f), localByName.get(key), f]);
  else localByName.set(key, f);
  if (!localByStem.has(stem(key))) localByStem.set(stem(key), f);
}
console.log(`  arquivos: ${all.length} (jpg ${jpgs.length}: ${originals.length} originais, ${thumbs.length} thumbs ignorados; outros ${all.length - jpgs.length})`);

// ---------- 2. carros no Appwrite ----------
const cars = [];
let cursor = null;
for (;;) {
  const page = await tablesDB.listRows({
    databaseId: DATABASE_ID, tableId: "cars", total: false,
    queries: [Query.isNotNull("sourceImagePath"), Query.select(["$id", "title", "sourceImagePath", "imageFileId"]),
      Query.limit(1000), Query.orderAsc("$id"), ...(cursor ? [Query.cursorAfter(cursor)] : [])],
  });
  cars.push(...page.rows);
  if (page.rows.length < 1000) break;
  cursor = page.rows.at(-1).$id;
}

// ---------- 3. casamento ----------
const matched = [];
const carsWithoutFile = [];
const usedNames = new Set();
for (const car of cars) {
  const name = path.posix.basename(car.sourceImagePath).toLowerCase();
  const byStem = !localByName.has(name) && localByStem.get(stem(name));
  const file = localByName.get(name) ?? byStem;
  if (file) {
    matched.push({ car, file, byExtension: Boolean(byStem) });
    usedNames.add(path.basename(file).toLowerCase());
  } else {
    carsWithoutFile.push([car.$id, car.title, car.sourceImagePath]);
  }
}
const filesWithoutCar = [...localByName].filter(([name]) => !usedNames.has(name)).map(([, f]) => [path.basename(f), f]);

let totalBytes = 0;
const tooBig = [];
const dims = [];
for (const m of matched) {
  m.size = (await stat(m.file)).size;
  totalBytes += m.size;
  if (m.size > MAX_FILE_SIZE) tooBig.push([m.car.$id, path.basename(m.file), m.size]);
}
for (const m of matched.filter((_, i) => i % Math.max(1, Math.floor(matched.length / 200)) === 0)) {
  const d = jpegSize(m.file);
  if (d) dims.push(d);
}
const sizes = matched.map((m) => m.size).sort((a, b) => a - b);
const pct = (p) => sizes[Math.min(sizes.length - 1, Math.floor(sizes.length * p))] ?? 0;
const alreadyLinked = matched.filter((m) => m.car.imageFileId).length;

console.log(`\nCarros com sourceImagePath: ${cars.length}`);
console.log(`  casam com arquivo local:      ${matched.length}${alreadyLinked ? ` (${alreadyLinked} já vinculados)` : ""}`);
console.log(`    (dos quais ${matched.filter((m) => m.byExtension).length} só diferem na extensão: banco .jpeg/.png, arquivo .jpg)`);
const notJpeg = matched.filter((m) => {
  const fd = openSync(m.file, "r");
  const head = Buffer.alloc(3);
  readSync(fd, head, 0, 3, 0);
  closeSync(fd);
  return !(head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff);
});
console.log(`  arquivos que não são JPEG de fato: ${notJpeg.length}`);
console.log(`  carros SEM arquivo local:     ${carsWithoutFile.length}`);
console.log(`  arquivos locais SEM carro:    ${filesWithoutCar.length}`);
console.log(`  nomes duplicados na pasta:    ${duplicateNames.length}`);
console.log(`  acima de 10 MB (limite):      ${tooBig.length}`);
console.log(`Tamanho a subir: ${mb(totalBytes)} — mediana ${mb(pct(0.5))}, p95 ${mb(pct(0.95))}, maior ${mb(sizes.at(-1) ?? 0)}`);
if (dims.length) {
  const ws = dims.map((d) => d.w).sort((a, b) => a - b);
  const hs = dims.map((d) => d.h).sort((a, b) => a - b);
  console.log(`Dimensões (amostra de ${dims.length}): largura ${ws[0]}–${ws.at(-1)} (mediana ${ws[Math.floor(ws.length / 2)]}), altura ${hs[0]}–${hs.at(-1)}`);
}

writeCsv("fotos-carros-sem-arquivo", ["carId", "titulo", "sourceImagePath"], carsWithoutFile);
writeCsv("fotos-arquivos-sem-carro", ["arquivo", "caminho"], filesWithoutCar);
if (duplicateNames.length) writeCsv("fotos-nomes-duplicados", ["arquivo", "primeiro", "segundo"], duplicateNames);
if (tooBig.length) writeCsv("fotos-acima-limite", ["carId", "arquivo", "bytes"], tooBig);

if (dryRun) process.exit(0);

// ---------- 4. upload ----------
const state = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : { done: {} };
const saveState = () => writeFileSync(statePath, JSON.stringify(state));


function previewUrl(fileId, p) {
  const url = new URL(`${process.env.APPWRITE_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${fileId}/preview`);
  for (const [k, v] of Object.entries(p)) url.searchParams.set(k, String(v));
  url.searchParams.set("project", process.env.APPWRITE_PROJECT_ID);
  return url;
}

async function uploadOne({ car, file }) {
  const fileId = car.$id.replace(/-/g, "");
  if (state.done[car.$id] === fileId && car.imageFileId === fileId) return "pulado";
  try {
    await storage.getFile({ bucketId: BUCKET_ID, fileId });
  } catch (err) {
    if (!isNotFound(err)) throw err;
    await storage.createFile({ bucketId: BUCKET_ID, fileId, file: InputFile.fromPath(file, path.basename(file)) });
  }
  if (car.imageFileId !== fileId) {
    await tablesDB.updateRow({ databaseId: DATABASE_ID, tableId: "cars", rowId: car.$id, data: { imageFileId: fileId } });
  }
  for (const p of PREVIEWS) await fetch(previewUrl(fileId, p)).then((r) => r.arrayBuffer());
  state.done[car.$id] = fileId;
  return "enviado";
}

await pauseCatalogSync(true);
const failures = [];
const started = Date.now();
let processed = 0;
try {
  // --limit=N: sobe só os N primeiros (teste de fumaça).
  const queue = args.limit ? matched.slice(0, Number(args.limit)) : [...matched];
  const queueSize = queue.length;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    for (let m = queue.shift(); m; m = queue.shift()) {
      for (let attempt = 1; ; attempt++) {
        try {
          await uploadOne(m);
          break;
        } catch (err) {
          if (attempt >= 4) {
            failures.push([m.car.$id, path.basename(m.file), err.message]);
            break;
          }
          await sleep(1500 * attempt);
        }
      }
      processed++;
      if (processed % 25 === 0) {
        saveState();
        const rate = processed / ((Date.now() - started) / 1000);
        process.stdout.write(`\r  ${processed}/${queueSize} — ${rate.toFixed(1)}/s — faltam ~${Math.round((queueSize - processed) / rate / 60)} min   `);
      }
    }
  }));
  saveState();
  console.log(`\nUpload: ${processed - failures.length} ok, ${failures.length} falhas em ${Math.round((Date.now() - started) / 60000)} min`);
  if (failures.length) writeCsv("fotos-falhas", ["carId", "arquivo", "erro"], failures);

  // Propaga o vínculo para a coleção (a catalog-sync estava desligada).
  let fixed = 0;
  let c = null;
  for (;;) {
    const page = await tablesDB.listRows({
      databaseId: DATABASE_ID, tableId: "collection_items", total: false,
      queries: [Query.select(["$id", "carId", "carImageFileId"]), Query.limit(1000), Query.orderAsc("$id"), ...(c ? [Query.cursorAfter(c)] : [])],
    });
    for (const row of page.rows) {
      const fileId = state.done[row.carId];
      if (fileId && row.carImageFileId !== fileId) {
        await tablesDB.updateRow({ databaseId: DATABASE_ID, tableId: "collection_items", rowId: row.$id, data: { carImageFileId: fileId } });
        fixed++;
      }
    }
    if (page.rows.length < 1000) break;
    c = page.rows.at(-1).$id;
  }
  console.log(`collection_items atualizados com a foto: ${fixed}`);
} finally {
  await pauseCatalogSync(false);
}
