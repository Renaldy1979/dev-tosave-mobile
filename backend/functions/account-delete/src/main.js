/**
 * Function `account-delete` — o usuário exclui a PRÓPRIA conta pelo app
 * (exigência da App Store). O SDK client não apaga o próprio usuário, então
 * a exclusão roda aqui, com a API key.
 *
 * Execução síncrona e autenticada; o usuário vem do header
 * `x-appwrite-user-id`, nunca do corpo. Corpo JSON conforme o modo de
 * confirmação (variável da Function `ACCOUNT_DELETE_CONFIRM`):
 *   - "password" (padrão): { password } — conferida criando uma sessão de
 *     e-mail e senha para o e-mail do usuário e apagando-a em seguida;
 *   - "word": { confirm: "EXCLUIR" }.
 *
 * Ordem: confirmação → limpeza SÍNCRONA dos dados do usuário (coleção e
 * estatísticas, sem depender da fila da user-cleanup) → users.delete.
 * Rate limit: 5 falhas em 15 min → 429. A senha nunca é logada (logging
 * desligado; nenhum log com dados do corpo).
 *
 * Respostas: 200 { ok: true } | 400 invalid_request | 401 unauthorized |
 * 401 wrong_password | 429 rate_limited | 500 unknown.
 */
import { createHash } from "node:crypto";
import { Client, TablesDB, Users, Account, Query } from "node-appwrite";

const DATABASE_ID = "tosave";
const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const CONFIRM_WORD = "EXCLUIR";
const USER_TABLES = ["collection_items", "user_series_stats", "user_year_stats"];

/** Corpo JSON da requisição; `{}` quando vazio ou inválido (o getter bodyJson lança). */
function readJson(req) {
  try {
    const parsed = JSON.parse(req.bodyText || req.body || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

const rateLimitRowId = (userId) => "ad_" + createHash("sha256").update(userId).digest("hex").slice(0, 32);

async function getRowOrNull(db, tableId, rowId) {
  try {
    return await db.getRow({ databaseId: DATABASE_ID, tableId, rowId });
  } catch (err) {
    if (err.code === 404) return null;
    throw err;
  }
}

/** true se o usuário estourou as falhas na janela atual. */
async function isRateLimited(db, userId) {
  const row = await getRowOrNull(db, "rate_limits", rateLimitRowId(userId));
  if (!row?.windowStart) return false;
  const inWindow = Date.now() - new Date(row.windowStart).getTime() < WINDOW_MS;
  return inWindow && row.attempts >= MAX_FAILURES;
}

async function recordFailure(db, userId) {
  const rowId = rateLimitRowId(userId);
  const row = await getRowOrNull(db, "rate_limits", rowId);
  const inWindow = row?.windowStart && Date.now() - new Date(row.windowStart).getTime() < WINDOW_MS;
  await db.upsertRow({
    databaseId: DATABASE_ID, tableId: "rate_limits", rowId,
    data: inWindow ? { attempts: row.attempts + 1, windowStart: row.windowStart } : { attempts: 1, windowStart: new Date().toISOString() },
  });
}

/**
 * Confere a senha criando uma sessão de e-mail e senha (com a API key a
 * resposta traz o id da sessão) e apagando-a em seguida. Só vale se a
 * sessão for do MESMO usuário que chamou.
 */
async function passwordMatches(client, users, userId, email, password) {
  let session;
  try {
    session = await new Account(client).createEmailPasswordSession({ email, password });
  } catch (err) {
    if (err.code === 401 || err.type === "user_invalid_credentials") return false;
    throw err;
  }
  await users.deleteSession({ userId: session.userId, sessionId: session.$id }).catch(() => {});
  return session.userId === userId;
}

export default async ({ req, res, error }) => {
  const userId = req.headers["x-appwrite-user-id"];
  if (!userId) return res.json({ error: "unauthorized" }, 401);

  const endpoint = process.env.TOSAVE_ENDPOINT || process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(req.headers["x-appwrite-key"]);
  const db = new TablesDB(client);
  const users = new Users(client);

  const body = readJson(req);
  const mode = process.env.ACCOUNT_DELETE_CONFIRM === "word" ? "word" : "password";

  try {
    if (await isRateLimited(db, userId)) return res.json({ error: "rate_limited" }, 429);

    if (mode === "word") {
      if (typeof body.confirm !== "string" || body.confirm.trim() !== CONFIRM_WORD) {
        await recordFailure(db, userId);
        return res.json({ error: "invalid_request" }, 400);
      }
    } else {
      if (typeof body.password !== "string" || body.password.length === 0) {
        return res.json({ error: "invalid_request" }, 400);
      }
      const user = await users.get({ userId });
      if (!(await passwordMatches(client, users, userId, user.email, body.password))) {
        await recordFailure(db, userId);
        return res.json({ error: "wrong_password" }, 401);
      }
    }

    // Limpeza síncrona: não depende da fila da user-cleanup.
    for (const tableId of USER_TABLES) {
      await db.deleteRows({ databaseId: DATABASE_ID, tableId, queries: [Query.equal("userId", userId)] });
    }
    for (const [tableId, rowId] of [["user_stats", userId], ["rate_limits", rateLimitRowId(userId)]]) {
      await db.deleteRow({ databaseId: DATABASE_ID, tableId, rowId }).catch((err) => {
        if (err.code !== 404) throw err;
      });
    }

    // Remove o usuário (sessões e memberships vão junto).
    await users.delete({ userId });
    return res.json({ ok: true });
  } catch (err) {
    // Sem dados do corpo no log (a senha nunca aparece).
    error(`account-delete falhou: ${err.code ?? ""} ${err.type ?? ""}`);
    return res.json({ error: "unknown" }, 500);
  }
};
