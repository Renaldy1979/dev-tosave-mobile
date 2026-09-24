/**
 * Function `serie-progress` — carros de UMA série com a marcação do que o
 * usuário possui, filtrando "Todos" / "Na coleção" / "Faltam", paginado.
 *
 * Por que no servidor: o Appwrite não tem "NOT IN" (notEqual aceita um
 * único valor e cada chamada aceita no máximo 100 queries), então
 * "Faltam" paginado não sai de uma query do app. Aqui a série inteira
 * (a maior tem ~520 carros) e os itens possuídos dela são lidos com a
 * API key, cruzados e fatiados.
 *
 * Execução síncrona pelo app, corpo JSON:
 *   { serieId, filter?: "all" | "owned" | "missing", cursor?: carId, pageSize?: 1..100 }
 * O usuário vem do header `x-appwrite-user-id`, nunca do corpo.
 * Resposta: { items, counts: { total, owned, missing }, nextCursor }.
 */
import { Client, TablesDB, Query } from "node-appwrite";

const DATABASE_ID = "tosave";
const PAGE = 1000;
const CAR_FIELDS = [
  "$id", "title", "year", "brandId", "brandName", "serieId", "serieTitle", "toy", "collector",
  "color", "scale", "seriePosition", "seriePositionNum", "imageFileId",
];

/** Corpo JSON da requisição; `{}` quando vazio ou inválido (o getter bodyJson lança). */
function readJson(req) {
  try {
    const parsed = JSON.parse(req.bodyText || req.body || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function listAll(db, tableId, queries) {
  const rows = [];
  let cursor = null;
  for (;;) {
    const page = await db.listRows({
      databaseId: DATABASE_ID, tableId, total: false,
      queries: [...queries, Query.limit(PAGE), Query.orderAsc("$id"), ...(cursor ? [Query.cursorAfter(cursor)] : [])],
    });
    rows.push(...page.rows);
    if (page.rows.length < PAGE) return rows;
    cursor = page.rows.at(-1).$id;
  }
}

/** Ordem da série: posição (sem posição vai ao fim), depois título e id. */
function bySeriePosition(a, b) {
  const pa = a.seriePositionNum ?? Number.MAX_SAFE_INTEGER;
  const pb = b.seriePositionNum ?? Number.MAX_SAFE_INTEGER;
  if (pa !== pb) return pa - pb;
  const t = a.title.localeCompare(b.title);
  return t !== 0 ? t : a.$id.localeCompare(b.$id);
}

export default async ({ req, res }) => {
  const userId = req.headers["x-appwrite-user-id"];
  if (!userId) return res.json({ error: "unauthorized" }, 401);

  const body = readJson(req);
  const { serieId, cursor } = body;
  const filter = body.filter ?? "all";
  const pageSize = Math.max(1, Math.min(100, Math.floor(Number(body.pageSize) || 20)));
  if (typeof serieId !== "string" || !serieId || !["all", "owned", "missing"].includes(filter)) {
    return res.json({ error: "invalid_request" }, 400);
  }

  const client = new Client()
    .setEndpoint(process.env.TOSAVE_ENDPOINT || process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers["x-appwrite-key"]);
  const db = new TablesDB(client);

  const [cars, ownedRows] = await Promise.all([
    listAll(db, "cars", [Query.equal("serieId", serieId), Query.select(CAR_FIELDS)]),
    listAll(db, "collection_items", [Query.equal("userId", userId), Query.equal("serieId", serieId), Query.select(["$id", "carId", "quantity"])]),
  ]);
  const quantityByCar = new Map(ownedRows.map((r) => [r.carId, r.quantity]));

  cars.sort(bySeriePosition);
  const owned = cars.filter((c) => quantityByCar.has(c.$id)).length;
  const counts = { total: cars.length, owned, missing: cars.length - owned };

  const filtered = cars.filter((c) =>
    filter === "all" ? true : filter === "owned" ? quantityByCar.has(c.$id) : !quantityByCar.has(c.$id)
  );
  let start = 0;
  if (cursor) {
    const i = filtered.findIndex((c) => c.$id === cursor);
    start = i < 0 ? 0 : i + 1;
  }
  const page = filtered.slice(start, start + pageSize);
  const items = page.map(({ $id, ...car }) => ({
    id: $id,
    ...Object.fromEntries(CAR_FIELDS.filter((f) => f !== "$id").map((f) => [f, car[f] ?? null])),
    owned: quantityByCar.has($id),
    quantity: quantityByCar.get($id) ?? 0,
  }));
  const nextCursor = start + pageSize < filtered.length ? page.at(-1).$id : null;
  return res.json({ items, counts, nextCursor });
};
