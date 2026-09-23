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

export function collectionRowId(userId, carId) {
  return "ci_" + createHash("sha256").update(`${userId}:${carId}`).digest("hex").slice(0, 32);
}

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
  };
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
    await tablesDB.updateTransaction({ transactionId, commit: true });
  } catch (err) {
    error(`collection ${action} falhou: ${err.message}`);
    await tablesDB.updateTransaction({ transactionId, rollback: true }).catch(() => {});
    return res.json({ error: "unknown" }, 500);
  }

  const [item, summary] = await Promise.all([
    newQty === 0 ? null : getRowOrNull(tablesDB, "collection_items", rowId),
    getRowOrNull(tablesDB, "user_stats", userId),
  ]);
  return res.json({ item: toItem(item), summary: toSummary(summary) });
};
