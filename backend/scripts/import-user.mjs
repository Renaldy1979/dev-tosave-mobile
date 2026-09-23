/**
 * Importa UMA conta da origem (Postgres, SOMENTE LEITURA) com a coleção.
 * Decisão do usuário: só a conta dele migra; as demais não.
 *
 * - Seleção: --role=admin (exige exatamente 1 usuário com essa role) ou
 *   IMPORT_USER_EMAIL=<e-mail> na variável de ambiente, nunca em arquivo.
 * - Conta: users.createBcryptUser com o MESMO id (uuid), e-mail, nome e
 *   hash bcrypt — a senha de hoje continua valendo. Status = is_active.
 *   expo_push_token vai para prefs. --admin-team coloca no time `admins`.
 * - Coleção: upsert em collection_items (id determinístico igual ao da
 *   Function `collection`), campos do carro desnormalizados a partir de
 *   `cars` no Appwrite, read só do dono. Depois recalcula user_stats.
 * - Idempotente: rodar de novo não duplica nada.
 * - O e-mail nunca é impresso em claro.
 *
 *   npm run import-user -- --role=admin --admin-team [--dry-run]
 */
import { createHash } from "node:crypto";
import pg from "pg";
import { Permission, Role, Query } from "node-appwrite";
import { users, teams, tablesDB, DATABASE_ID, ADMINS_TEAM_ID, isConflict } from "../lib/appwrite.mjs";

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, "").split("=");
  return [k, v ?? true];
}));
const dryRun = Boolean(args["dry-run"]);
const mask = (email) => email.replace(/^(.{2}).*@(.).*?(\.[^.]+)$/, "$1***@$2***$3");

/** Igual a functions/collection/src/main.js — precisa gerar o mesmo id. */
const collectionRowId = (userId, carId) =>
  "ci_" + createHash("sha256").update(`${userId}:${carId}`).digest("hex").slice(0, 32);

const env = process.env;
const pgClient = new pg.Client({
  host: env.SOURCE_PG_HOST, port: Number(env.SOURCE_PG_PORT), database: env.SOURCE_PG_DATABASE,
  user: env.SOURCE_PG_USER, password: env.SOURCE_PG_PASSWORD,
  options: "-c default_transaction_read_only=on",
});
await pgClient.connect();

try {
  let candidates;
  if (env.IMPORT_USER_EMAIL) {
    candidates = (await pgClient.query(`select * from users where lower(email) = lower($1)`, [env.IMPORT_USER_EMAIL])).rows;
  } else if (args.role) {
    candidates = (await pgClient.query(`select * from users where role = $1`, [args.role])).rows;
  } else {
    throw new Error("Informe --role=<role> ou IMPORT_USER_EMAIL");
  }
  if (candidates.length !== 1) throw new Error(`Seleção deve casar exatamente 1 usuário (casou ${candidates.length})`);
  const src = candidates[0];
  console.log(`Usuário: ${mask(src.email)} (id ${src.id}, role ${src.role}, ativo ${src.is_active})${dryRun ? " — DRY-RUN" : ""}`);

  // ---------- conta ----------
  if (!/^\$2[aby]\$/.test(src.password_hash)) throw new Error("hash não é bcrypt");
  if (!dryRun) {
    try {
      await users.createBcryptUser({ userId: src.id, email: src.email.toLowerCase(), password: src.password_hash, name: src.name });
      console.log("+ conta criada (hash bcrypt original)");
    } catch (err) {
      if (!isConflict(err)) throw err;
      console.log("= conta já existia");
    }
    await users.updateStatus({ userId: src.id, status: Boolean(src.is_active) });
    if (src.expo_push_token) await users.updatePrefs({ userId: src.id, prefs: { expoPushToken: src.expo_push_token } });
    if (args["admin-team"]) {
      try {
        await teams.createMembership({ teamId: ADMINS_TEAM_ID, roles: ["admin"], userId: src.id });
        console.log(`+ membro do time ${ADMINS_TEAM_ID}`);
      } catch (err) {
        if (!isConflict(err)) throw err;
        console.log(`= já era membro do time ${ADMINS_TEAM_ID}`);
      }
    }
  }

  // ---------- coleção ----------
  const items = (await pgClient.query(`select car_id, quantity, created_at from collections where user_id = $1 order by car_id`, [src.id])).rows;
  const ownerRead = [Permission.read(Role.user(src.id))];
  const missing = [];
  let imported = 0;
  for (let i = 0; i < items.length; i += 100) {
    const chunk = items.slice(i, i + 100);
    const { rows: cars } = await tablesDB.listRows({
      databaseId: DATABASE_ID, tableId: "cars", total: false,
      queries: [Query.equal("$id", chunk.map((c) => c.car_id)), Query.limit(100)],
    });
    const byId = new Map(cars.map((c) => [c.$id, c]));
    const rows = [];
    for (const item of chunk) {
      const car = byId.get(item.car_id);
      if (!car) {
        missing.push(item.car_id);
        continue;
      }
      rows.push({
        $id: collectionRowId(src.id, car.$id),
        $permissions: ownerRead,
        userId: src.id,
        carId: car.$id,
        quantity: Math.max(1, Math.min(99, item.quantity)),
        carTitle: car.title, carToy: car.toy, carCollector: car.collector, carYear: car.year,
        carColor: car.color, carScale: car.scale, carSeriePosition: car.seriePosition,
        carImageFileId: car.imageFileId, brandId: car.brandId, brandName: car.brandName,
        serieId: car.serieId, serieTitle: car.serieTitle, searchText: car.searchText,
        sourceCreatedAt: new Date(item.created_at).toISOString(),
      });
    }
    if (!dryRun && rows.length) await tablesDB.upsertRows({ databaseId: DATABASE_ID, tableId: "collection_items", rows });
    imported += rows.length;
  }
  console.log(`Coleção: ${imported} de ${items.length} itens${missing.length ? `; ${missing.length} carros ausentes no Appwrite: ${missing.join(", ")}` : ""}`);

  // ---------- user_stats (recalculado a partir de collection_items) ----------
  if (!dryRun) {
    let totalItems = 0, totalModels = 0, duplicates = 0, cursor = null;
    for (;;) {
      const page = await tablesDB.listRows({
        databaseId: DATABASE_ID, tableId: "collection_items", total: false,
        queries: [Query.equal("userId", src.id), Query.select(["$id", "quantity"]), Query.limit(1000), Query.orderAsc("$id"),
          ...(cursor ? [Query.cursorAfter(cursor)] : [])],
      });
      for (const r of page.rows) {
        totalItems += r.quantity;
        totalModels += 1;
        if (r.quantity > 1) duplicates += 1;
      }
      if (page.rows.length < 1000) break;
      cursor = page.rows.at(-1).$id;
    }
    await tablesDB.upsertRow({
      databaseId: DATABASE_ID, tableId: "user_stats", rowId: src.id,
      data: { totalItems, totalModels, duplicates }, permissions: ownerRead,
    });
    console.log(`user_stats: ${totalItems} unidades, ${totalModels} modelos, ${duplicates} repetidos`);

    const [expected] = (await pgClient.query(
      `select count(*)::int modelos, sum(quantity)::int unidades, count(*) filter (where quantity > 1)::int repetidos from collections where user_id = $1`,
      [src.id]
    )).rows;
    const ok = expected.modelos === totalModels && expected.unidades === totalItems && expected.repetidos === duplicates;
    console.log(`Conferência com a origem: ${ok ? "OK" : "DIVERGE"} (origem ${expected.unidades}/${expected.modelos}/${expected.repetidos})`);
    if (!ok) process.exitCode = 1;
  }
} finally {
  await pgClient.end();
}

