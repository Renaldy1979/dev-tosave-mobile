/**
 * Validação da Function `account-delete` SÓ com usuários de TESTE criados
 * aqui (e-mail alicerce-teste-*@tosave.test). Uma trava recusa qualquer
 * outro usuário: a conta real nunca é alvo.
 *
 * Cobre: senha errada (401) e vazia (400), rate limit (5 falhas → 429),
 * exclusão correta (200) com NADA sobrando em nenhuma tabela, sessão
 * invalidada, chamada sem sessão recusada.
 *
 *   npm run validate-account-delete            (modo "password", o atual)
 *   npm run validate-account-delete -- --word  (só se a Function estiver em "word")
 */
import { randomBytes, createHash } from "node:crypto";
import { Client, Account, Functions, ID, Query, ExecutionMethod } from "node-appwrite";
import { users, tablesDB, DATABASE_ID } from "../lib/appwrite.mjs";

const { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY } = process.env;
const wordMode = process.argv.includes("--word");
const TEST_EMAIL = /^alicerce-teste-[a-z-]+-\d+@tosave\.test$/;
const results = [];
/** Mesmo id da Function account-delete. */
const rateLimitRowId = (userId) => "ad_" + createHash("sha256").update(userId).digest("hex").slice(0, 32);
const created = [];
function check(label, ok, detail = "") {
  results.push({ teste: label, resultado: ok ? "OK" : "FALHOU", detalhe: String(detail).slice(0, 90) });
  if (!ok) process.exitCode = 1;
}

async function createTestUser(tag) {
  const email = `alicerce-teste-${tag}-${Date.now()}@tosave.test`;
  const password = randomBytes(12).toString("base64url");
  const user = await users.create({ userId: ID.unique(), email, password, name: `Teste ${tag}` });
  created.push(user);
  const adminAccount = new Account(new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY));
  const session = await adminAccount.createEmailPasswordSession({ email, password });
  const client = new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setSession(session.secret);
  return { user, password, client, fn: new Functions(client) };
}

async function call(fn, functionId, body) {
  const e = await fn.createExecution({ functionId, body: JSON.stringify(body), async: false, method: ExecutionMethod.POST, headers: { "content-type": "application/json" } });
  return { status: e.responseStatusCode, body: JSON.parse(e.responseBody || "{}"), ms: Math.round(e.duration * 1000) };
}

/** Linhas do usuário em cada tabela (tudo tem que dar 0 depois da exclusão). */
async function leftovers(userId) {
  const out = {};
  for (const t of ["collection_items", "user_series_stats", "user_year_stats"]) {
    out[t] = (await tablesDB.listRows({ databaseId: DATABASE_ID, tableId: t, queries: [Query.equal("userId", userId), Query.limit(1)] })).total;
  }
  out.user_stats = await tablesDB.getRow({ databaseId: DATABASE_ID, tableId: "user_stats", rowId: userId }).then(() => 1).catch(() => 0);
  out.rate_limits = await tablesDB.getRow({ databaseId: DATABASE_ID, tableId: "rate_limits", rowId: rateLimitRowId(userId) }).then(() => 1).catch(() => 0);
  out.auth = await users.get({ userId }).then(() => 1).catch(() => 0);
  return out;
}

try {
  // ---------- A: fluxo principal ----------
  const a = await createTestUser("delete");
  const cars = (await tablesDB.listRows({ databaseId: DATABASE_ID, tableId: "cars", queries: [Query.limit(2)] })).rows;
  for (const car of cars) await call(a.fn, "collection", { action: "add", carId: car.$id });
  const before = await leftovers(a.user.$id);
  check("usuário de teste com coleção e estatísticas", before.collection_items >= 1 && before.user_stats === 1 && before.user_series_stats >= 1 && before.user_year_stats >= 1, JSON.stringify(before));

  if (wordMode) {
    const bad = await call(a.fn, "account-delete", { confirm: "excluir errado" });
    check("palavra errada → 400", bad.status === 400);
  } else {
    const empty = await call(a.fn, "account-delete", {});
    check("sem senha → 400", empty.status === 400, empty.body.error);
    const wrong = await call(a.fn, "account-delete", { password: "senha-errada-123" });
    check("senha errada → 401 wrong_password, conta intacta", wrong.status === 401 && wrong.body.error === "wrong_password" && (await users.get({ userId: a.user.$id }).then(() => true).catch(() => false)), `${wrong.ms} ms`);
  }

  const ok = await call(a.fn, "account-delete", wordMode ? { confirm: "EXCLUIR" } : { password: a.password });
  check("confirmação correta → 200", ok.status === 200 && ok.body.ok === true, `${ok.ms} ms`);
  const after = await leftovers(a.user.$id);
  check("NADA sobra, na hora (sem esperar a fila)", Object.values(after).every((n) => n === 0), JSON.stringify(after));
  const dead = await new Account(a.client).get().then(() => "viva").catch((e) => e.code);
  check("sessão do usuário excluído não funciona mais", dead === 401, dead);

  // ---------- B: rate limit ----------
  if (!wordMode) {
    const b = await createTestUser("ratelimit");
    const codes = [];
    for (let i = 0; i < 6; i++) codes.push((await call(b.fn, "account-delete", { password: `errada-${i}` })).status);
    check("5 falhas → 6ª tentativa 429", codes.slice(0, 5).every((c) => c === 401) && codes[5] === 429, codes.join(","));
    const blocked = await call(b.fn, "account-delete", { password: b.password });
    check("bloqueado mesmo com a senha certa (janela de 15 min)", blocked.status === 429 && (await users.get({ userId: b.user.$id }).then(() => true).catch(() => false)));
  }

  // ---------- sem sessão ----------
  const guest = new Functions(new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID));
  const anon = await guest.createExecution({ functionId: "account-delete", body: "{}", async: false }).then((e) => e.responseStatusCode).catch((e) => e.code);
  check("sem sessão → recusado", anon === 401, anon);
} catch (err) {
  check("execução", false, err.message);
} finally {
  // Limpeza: só usuários de teste criados aqui (trava pelo padrão do e-mail).
  for (const u of created) {
    if (!TEST_EMAIL.test(u.email)) throw new Error(`recusado: ${u.$id} não é usuário de teste`);
    await users.delete({ userId: u.$id }).catch(() => {});
    for (const t of ["collection_items", "user_series_stats", "user_year_stats"]) {
      await tablesDB.deleteRows({ databaseId: DATABASE_ID, tableId: t, queries: [Query.equal("userId", u.$id)] }).catch(() => {});
    }
    await tablesDB.deleteRow({ databaseId: DATABASE_ID, tableId: "user_stats", rowId: u.$id }).catch(() => {});
  }
  // Rate limit: só as linhas dos usuários de teste criados aqui.
  for (const u of created) {
    await tablesDB.deleteRow({ databaseId: DATABASE_ID, tableId: "rate_limits", rowId: rateLimitRowId(u.$id) }).catch(() => {});
  }
  console.table(results);
}
