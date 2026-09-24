/**
 * Function `user-cleanup` — evento `users.*.delete`.
 * Apaga a coleção e as estatísticas do usuário removido do Auth.
 */
import { Client, TablesDB, Query } from "node-appwrite";

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

export default async ({ req, res, log }) => {
  const user = readJson(req);
  const userId = user.$id;
  if (!userId) return res.json({ error: "missing_user" }, 400);

  const client = new Client()
    .setEndpoint(process.env.TOSAVE_ENDPOINT || process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers["x-appwrite-key"]);
  const db = new TablesDB(client);

  for (const tableId of ["collection_items", "user_series_stats", "user_year_stats"]) {
    await db.deleteRows({ databaseId: DATABASE_ID, tableId, queries: [Query.equal("userId", userId)] });
  }
  await db.deleteRow({ databaseId: DATABASE_ID, tableId: "user_stats", rowId: userId }).catch((err) => {
    if (err.code !== 404) throw err;
  });
  log(`coleção e estatísticas do usuário ${userId} removidas`);
  return res.json({ ok: true });
};
