/**
 * Aplica o schema do ToSave no Appwrite de forma IDEMPOTENTE:
 * database, tabelas, colunas, índices, bucket `car-images` e time `admins`.
 *
 * Só cria o que falta e atualiza permissões/flags de tabela e bucket.
 * Nunca apaga nada. Coluna existente com definição diferente é só
 * reportada (mudar tipo exigiria apagar e recriar).
 *
 *   npm run schema
 */
import {
  tablesDB, storage, teams, DATABASE_ID, BUCKET_ID, ADMINS_TEAM_ID,
  isNotFound, isConflict, sleep,
} from "../lib/appwrite.mjs";
import { TABLES, BUCKET } from "../lib/schema.mjs";

const log = (...args) => console.log(...args);

async function ensureDatabase() {
  try {
    await tablesDB.get({ databaseId: DATABASE_ID });
    log(`= database ${DATABASE_ID}`);
  } catch (err) {
    if (!isNotFound(err)) throw err;
    await tablesDB.create({ databaseId: DATABASE_ID, name: "ToSave" });
    log(`+ database ${DATABASE_ID}`);
  }
}

async function ensureTable(def) {
  const base = { databaseId: DATABASE_ID, tableId: def.id };
  try {
    await tablesDB.getTable(base);
    await tablesDB.updateTable({ ...base, name: def.name, permissions: def.permissions, rowSecurity: def.rowSecurity, enabled: true });
    log(`= tabela ${def.id} (permissões atualizadas)`);
  } catch (err) {
    if (!isNotFound(err)) throw err;
    await tablesDB.createTable({ ...base, name: def.name, permissions: def.permissions, rowSecurity: def.rowSecurity, enabled: true });
    log(`+ tabela ${def.id}`);
  }
}

function createColumn(tableId, col) {
  const base = { databaseId: DATABASE_ID, tableId, key: col.key, required: col.required, array: col.array ?? false };
  // Coluna obrigatória não aceita default no Appwrite.
  const xdefault = col.required ? undefined : col.xdefault;
  switch (col.kind) {
    case "string": return tablesDB.createStringColumn({ ...base, size: col.size, xdefault });
    case "integer": return tablesDB.createIntegerColumn({ ...base, min: col.min, max: col.max, xdefault });
    case "boolean": return tablesDB.createBooleanColumn({ ...base, xdefault });
    case "datetime": return tablesDB.createDatetimeColumn({ ...base, xdefault });
    case "enum": return tablesDB.createEnumColumn({ ...base, elements: col.elements, xdefault });
    default: throw new Error(`tipo desconhecido: ${col.kind}`);
  }
}

/** Espera todas as colunas/índices da tabela saírem de "processing". */
async function waitAvailable(tableId, what) {
  for (let i = 0; i < 120; i++) {
    const table = await tablesDB.getTable({ databaseId: DATABASE_ID, tableId });
    const items = what === "columns" ? table.columns : table.indexes;
    const failed = items.filter((x) => x.status === "failed");
    if (failed.length) throw new Error(`${tableId}: ${what} com falha: ${failed.map((x) => `${x.key} (${x.error})`).join(", ")}`);
    if (items.every((x) => x.status === "available")) return table;
    await sleep(1000);
  }
  throw new Error(`${tableId}: ${what} não ficaram disponíveis em 120 s`);
}

async function ensureColumns(def) {
  const table = await tablesDB.getTable({ databaseId: DATABASE_ID, tableId: def.id });
  const existing = new Map(table.columns.map((c) => [c.key, c]));
  for (const col of def.columns) {
    const found = existing.get(col.key);
    if (found) {
      if (found.type !== col.kind || (col.size && found.size !== col.size) || Boolean(found.array) !== Boolean(col.array)) {
        log(`! ${def.id}.${col.key} existe com definição diferente (${found.type}/${found.size ?? "-"}); não alterado`);
      }
      continue;
    }
    await createColumn(def.id, col);
    log(`+ coluna ${def.id}.${col.key}`);
  }
  await waitAvailable(def.id, "columns");
}

async function ensureIndexes(def) {
  const table = await tablesDB.getTable({ databaseId: DATABASE_ID, tableId: def.id });
  const existing = new Set(table.indexes.map((i) => i.key));
  for (const idx of def.indexes) {
    if (existing.has(idx.key)) continue;
    await tablesDB.createIndex({
      databaseId: DATABASE_ID, tableId: def.id, key: idx.key, type: idx.type,
      columns: idx.columns, orders: idx.orders,
    });
    log(`+ índice ${def.id}.${idx.key}`);
    // Criar em sequência: o MariaDB processa um ALTER por vez na tabela.
    await waitAvailable(def.id, "indexes");
  }
}

async function ensureBucket() {
  const params = { bucketId: BUCKET_ID, ...BUCKET };
  try {
    await storage.getBucket({ bucketId: BUCKET_ID });
    await storage.updateBucket(params);
    log(`= bucket ${BUCKET_ID} (configuração atualizada)`);
  } catch (err) {
    if (!isNotFound(err)) throw err;
    await storage.createBucket(params);
    log(`+ bucket ${BUCKET_ID}`);
  }
}

async function ensureTeam() {
  try {
    await teams.create({ teamId: ADMINS_TEAM_ID, name: "Admins" });
    log(`+ time ${ADMINS_TEAM_ID}`);
  } catch (err) {
    if (!isConflict(err)) throw err;
    log(`= time ${ADMINS_TEAM_ID}`);
  }
}

await ensureDatabase();
await ensureTeam();
for (const def of TABLES) {
  await ensureTable(def);
  await ensureColumns(def);
  await ensureIndexes(def);
}
await ensureBucket();
log("\nSchema aplicado.");
