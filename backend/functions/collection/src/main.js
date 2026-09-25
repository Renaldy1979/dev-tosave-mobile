/**
 * Function `collection` — única escritora de `collection_items` e `user_stats`.
 *
 * Chamada pelo app com execução síncrona (functions.createExecution) e
 * corpo JSON: { action: "add" | "set" | "remove", carId, quantity? }.
 * O usuário vem do header `x-appwrite-user-id` (injetado pelo Appwrite),
 * nunca do corpo.
 *
 * Item e estatísticas mudam na MESMA transação (TablesDB 1.8), com
 * incremento atômico nos contadores. Resposta: { item, summary }.
 */
import { createHash } from "node:crypto";
import { Client, TablesDB, Permission, Role } from "node-appwrite";

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
const MAX_QUANTITY = 99;

const hash32 = (text) => createHash("sha256").update(text).digest("hex").slice(0, 32);

export function collectionRowId(userId, carId) {
  return "ci_" + hash32(`${userId}:${carId}`);
}

/** Progresso da série em milésimos, travado em 1000 (carro órfão não passa de 100%). */
export const seriePct = (owned, carCount) => (carCount > 0 ? Math.min(1000, Math.round((owned * 1000) / carCount)) : 0);

/** Linhas de estatística por série e por ano (ids determinísticos). */
export const serieStatsRowId = (userId, serieId) => "us_" + hash32(`${userId}:${serieId}`);
export const yearStatsRowId = (userId, year) => "uy_" + hash32(`${userId}:${year}`);

async function getRowOrNull(tablesDB, tableId, rowId) {
  try {
    return await tablesDB.getRow({ databaseId: DATABASE_ID, tableId, rowId });
  } catch (err) {
    if (err.code === 404) return null;
    throw err;
  }
}

function denormalize(car) {
  return {
    carTitle: car.title,
    carToy: car.toy ?? "",
    carCollector: car.collector ?? "",
    carYear: car.year,
    carColor: car.color ?? "",
    carScale: car.scale ?? "",
    carSeriePosition: car.seriePosition ?? null,
    carImageFileId: car.imageFileId ?? null,
    brandId: car.brandId,
    brandName: car.brandName ?? "",
    serieId: car.serieId,
    serieTitle: car.serieTitle ?? "",
    searchText: car.searchText ?? "",
    carAttributeIds: car.attributeIds ?? [],
  };
}

// ---------- trava por usuário (tabela locks, só o servidor) ----------
const LOCK_TTL_MS = 20000;
const LOCK_WAIT_MS = 20000;
const lockRowId = (userId) => "lk_" + hash32(userId);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Cria a linha de trava; 409 = outra execução está com ela. Trava vencida é removida. */
async function acquireUserLock(tablesDB, userId) {
  const rowId = lockRowId(userId);
  const deadline = Date.now() + LOCK_WAIT_MS;
  while (Date.now() < deadline) {
    try {
      await tablesDB.createRow({ databaseId: DATABASE_ID, tableId: "locks", rowId, data: { expiresAt: new Date(Date.now() + LOCK_TTL_MS).toISOString() } });
      return true;
    } catch (err) {
      if (err.code !== 409) throw err;
      const current = await getRowOrNull(tablesDB, "locks", rowId);
      if (current && new Date(current.expiresAt).getTime() < Date.now()) {
        await tablesDB.deleteRow({ databaseId: DATABASE_ID, tableId: "locks", rowId }).catch(() => {});
        continue;
      }
      await sleep(100 + Math.floor(Math.random() * 100));
    }
  }
  return false;
}

async function releaseUserLock(tablesDB, userId) {
  await tablesDB.deleteRow({ databaseId: DATABASE_ID, tableId: "locks", rowId: lockRowId(userId) }).catch(() => {});
}

const toItem = (row) =>
  row && { id: row.$id, userId: row.userId, carId: row.carId, quantity: row.quantity, createdAt: row.$createdAt };

const toSummary = (stats) => ({
  totalItems: stats?.totalItems ?? 0,
  totalModels: stats?.totalModels ?? 0,
  duplicates: stats?.duplicates ?? 0,
});

export default async ({ req, res, error }) => {
  const userId = req.headers["x-appwrite-user-id"];
  if (!userId) return res.json({ error: "unauthorized" }, 401);

  const body = readJson(req);
  const { action, carId } = body;
  if (!["add", "set", "remove"].includes(action) || typeof carId !== "string" || !carId) {
    return res.json({ error: "invalid_request" }, 400);
  }

  const client = new Client()
    .setEndpoint(process.env.TOSAVE_ENDPOINT || process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers["x-appwrite-key"]);
  const tablesDB = new TablesDB(client);

  // Uma mutação por usuário de cada vez: chamadas simultâneas (toques
  // repetidos) esperam a anterior terminar e leem o estado já gravado.
  if (!(await acquireUserLock(tablesDB, userId))) return res.json({ error: "busy" }, 503);
  try {
    const rowId = collectionRowId(userId, carId);
    const ownerRead = [Permission.read(Role.user(userId))];

    const existing = await getRowOrNull(tablesDB, "collection_items", rowId);
    const oldQty = existing?.quantity ?? 0;
    let newQty;
    if (action === "add") newQty = Math.min(oldQty + 1, MAX_QUANTITY);
    else if (action === "remove") newQty = 0;
    else newQty = Math.max(0, Math.min(MAX_QUANTITY, Math.floor(Number(body.quantity) || 0)));

    let stats = await getRowOrNull(tablesDB, "user_stats", userId);
    if (newQty === oldQty) return res.json({ item: toItem(existing), summary: toSummary(stats) });

    let car = null;
    if (newQty > 0) {
      car = await getRowOrNull(tablesDB, "cars", carId);
      if (!car) return res.json({ error: "car_not_found" }, 404);
    }

    if (!stats) {
      stats = await tablesDB.upsertRow({
        databaseId: DATABASE_ID, tableId: "user_stats", rowId: userId,
        data: { totalItems: 0, totalModels: 0, duplicates: 0 }, permissions: ownerRead,
      });
    }

    const deltas = {
      totalItems: newQty - oldQty,
      totalModels: (newQty > 0 ? 1 : 0) - (oldQty > 0 ? 1 : 0),
      duplicates: (newQty > 1 ? 1 : 0) - (oldQty > 1 ? 1 : 0),
    };

    // Modelo entrou (+1) ou saiu (-1): ajusta também série e ano. A série e o
    // ano vêm do carro (entrada) ou da linha desnormalizada (saída).
    const modelDelta = deltas.totalModels;
    const serieId = car?.serieId ?? existing?.serieId;
    const year = car?.year ?? existing?.carYear;
    const breakdown = [];
    if (modelDelta !== 0 && serieId) {
      const serieTitle = car?.serieTitle ?? existing?.serieTitle ?? "";
      breakdown.push({ tableId: "user_series_stats", rowId: serieStatsRowId(userId, serieId), data: { userId, serieId, owned: 0, serieTitle } });
    }
    if (modelDelta !== 0 && year) {
      breakdown.push({ tableId: "user_year_stats", rowId: yearStatsRowId(userId, year), data: { userId, year, owned: 0 } });
    }
    // Garante as linhas antes da transação (o incremento exige linha existente).
    for (const b of breakdown) {
      if (!(await getRowOrNull(tablesDB, b.tableId, b.rowId))) {
        await tablesDB.upsertRow({ databaseId: DATABASE_ID, tableId: b.tableId, rowId: b.rowId, data: b.data, permissions: ownerRead });
      }
    }

    const tx = await tablesDB.createTransaction({ ttl: 60 });
    const transactionId = tx.$id;
    try {
      if (newQty === 0) {
        await tablesDB.deleteRow({ databaseId: DATABASE_ID, tableId: "collection_items", rowId, transactionId });
      } else {
        await tablesDB.upsertRow({
          databaseId: DATABASE_ID, tableId: "collection_items", rowId, transactionId,
          data: { userId, carId, quantity: newQty, ...denormalize(car) },
          permissions: ownerRead,
        });
      }
      for (const [column, delta] of Object.entries(deltas)) {
        if (delta > 0) {
          await tablesDB.incrementRowColumn({ databaseId: DATABASE_ID, tableId: "user_stats", rowId: userId, column, value: delta, transactionId });
        } else if (delta < 0) {
          await tablesDB.decrementRowColumn({ databaseId: DATABASE_ID, tableId: "user_stats", rowId: userId, column, value: -delta, min: 0, transactionId });
        }
      }
      for (const b of breakdown) {
        const params = { databaseId: DATABASE_ID, tableId: b.tableId, rowId: b.rowId, column: "owned", value: 1, transactionId };
        if (modelDelta > 0) await tablesDB.incrementRowColumn(params);
        else await tablesDB.decrementRowColumn({ ...params, min: 0 });
      }
      await tablesDB.updateTransaction({ transactionId, commit: true });
    } catch (err) {
      error(`collection ${action} falhou: ${err.message}`);
      await tablesDB.updateTransaction({ transactionId, rollback: true }).catch(() => {});
      return res.json({ error: "unknown" }, 500);
    }

    // pct/serieCarCount da série, recalculados do `owned` já commitado: com
    // toques concorrentes, o último a rodar converge para o valor certo.
    const serieRow = breakdown.find((b) => b.tableId === "user_series_stats");
    if (serieRow) {
      const [stat, serie] = await Promise.all([
        getRowOrNull(tablesDB, "user_series_stats", serieRow.rowId),
        getRowOrNull(tablesDB, "series", serieId),
      ]);
      const serieCarCount = serie?.carCount ?? 0;
      const serieTitle = serie?.title ?? stat?.serieTitle ?? "";
      const pct = seriePct(stat?.owned ?? 0, serieCarCount);
      if (stat && (stat.pct !== pct || stat.serieCarCount !== serieCarCount || stat.serieTitle !== serieTitle)) {
        await tablesDB.updateRow({ databaseId: DATABASE_ID, tableId: "user_series_stats", rowId: serieRow.rowId, data: { pct, serieCarCount, serieTitle } });
      }
    }

    const [item, summary] = await Promise.all([
      newQty === 0 ? null : getRowOrNull(tablesDB, "collection_items", rowId),
      getRowOrNull(tablesDB, "user_stats", userId),
    ]);
    return res.json({ item: toItem(item), summary: toSummary(summary) });
  } finally {
    await releaseUserLock(tablesDB, userId);
  }
};
