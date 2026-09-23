/**
 * Validação ponta a ponta do backend com usuários de TESTE criados aqui
 * e apagados no fim (só eles).
 *
 * 1. bcrypt: cria um usuário com hash $2b$ gerado localmente
 *    (users.createBcryptUser), faz login com a senha e apaga o usuário.
 * 2. Fluxo do app com um usuário de teste:
 *    cadastro (account.create, sem API key) → login → catálogo paginado
 *    por cursor → busca → Function `collection` (add/add/add/set/remove)
 *    → user_stats → escrita direta proibida → apagar usuário →
 *    user-cleanup limpou a coleção.
 *
 *   npm run validate
 */
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { Client, Account, TablesDB, Functions, ID, Query, ExecutionMethod } from "node-appwrite";
import { users, tablesDB as adminDb, DATABASE_ID, sleep, isNotFound } from "../lib/appwrite.mjs";

const { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY } = process.env;
const created = [];
const results = [];

function check(label, ok, detail = "") {
  results.push({ teste: label, resultado: ok ? "OK" : "FALHOU", detalhe: String(detail).slice(0, 90) });
  if (!ok) process.exitCode = 1;
}

/** Cliente "de servidor" que devolve o secret da sessão (padrão SSR). */
const adminAccount = new Account(new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY));

function sessionClient(secret) {
  return new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setSession(secret);
}

const testEmail = (tag) => `alicerce-teste-${tag}-${Date.now()}@tosave.test`;
const testPassword = () => randomBytes(12).toString("base64url");

async function bcryptCheck(prefix) {
  const password = testPassword();
  const hash = bcrypt.hashSync(password, 10).replace(/^\$2[aby]\$/, prefix);
  const userId = ID.unique();
  const email = testEmail("bcrypt");
  await users.createBcryptUser({ userId, email, password: hash, name: "Teste bcrypt" });
  created.push(userId);
  try {
    const session = await adminAccount.createEmailPasswordSession({ email, password });
    return Boolean(session.secret);
  } catch {
    return false;
  }
}

async function run() {
  // ---------- 1. bcrypt ----------
  const b2b = await bcryptCheck("$2b$");
  check("bcrypt $2b$ aceito no login", b2b);
  if (!b2b) check("bcrypt $2a$ aceito no login (contingência)", await bcryptCheck("$2a$"));

  // ---------- 2. cadastro pelo app (sem API key) ----------
  const email = testEmail("app");
  const password = testPassword();
  const guest = new Account(new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID));
  let user;
  try {
    user = await guest.create({ userId: ID.unique(), email, password, name: "Teste Alicerce" });
    check("cadastro aberto (account.create sem key)", user.name === "Teste Alicerce", user.$id);
  } catch (err) {
    check("cadastro aberto (account.create sem key)", false, `${err.type}: serviço Account desligado no console`);
    // Segue o resto da validação com a conta criada pelo servidor.
    user = await users.create({ userId: ID.unique(), email, password, name: "Teste Alicerce" });
  }
  created.push(user.$id);

  const session = await adminAccount.createEmailPasswordSession({ email, password });
  const client = sessionClient(session.secret);
  const me = await new Account(client).get().catch((err) => ({ error: err.type }));
  check("login e account.get (cliente)", me.$id === user.$id, me.error ?? "");

  const db = new TablesDB(client);
  const fn = new Functions(client);

  // ---------- catálogo paginado ----------
  const orders = [Query.orderDesc("year"), Query.orderAsc("title")];
  const select = Query.select(["$id", "title", "year", "brandName", "serieTitle", "toy", "imageFileId"]);
  const p1 = await db.listRows({ databaseId: DATABASE_ID, tableId: "cars", queries: [...orders, select, Query.limit(20)] });
  const p2 = await db.listRows({
    databaseId: DATABASE_ID, tableId: "cars", total: false,
    queries: [...orders, select, Query.limit(20), Query.cursorAfter(p1.rows.at(-1).$id)],
  });
  const overlap = p2.rows.filter((r) => p1.rows.some((x) => x.$id === r.$id)).length;
  check("catálogo página 1 (20 itens)", p1.rows.length === 20, `total=${p1.total} (limite de contagem do Appwrite)`);
  check("catálogo página 2 por cursor, sem repetição", p2.rows.length === 20 && overlap === 0, `1º: ${p2.rows[0].title} ${p2.rows[0].year}`);

  const meta = await db.getRow({ databaseId: DATABASE_ID, tableId: "catalog_meta", rowId: "global" });
  check("catalog_meta legível (total e anos)", meta.totalCars === 10655, `${meta.totalCars} carros, ${meta.years.length} anos`);

  const search = await db.listRows({ databaseId: DATABASE_ID, tableId: "cars", queries: [Query.search("searchText", "camaro"), Query.limit(5)] });
  check("busca fulltext 'camaro'", search.rows.length > 0, `${search.total} resultados`);

  const serieCars = p1.rows[0];
  const full = await db.getRow({ databaseId: DATABASE_ID, tableId: "cars", rowId: serieCars.$id });
  const serie = await db.getRow({ databaseId: DATABASE_ID, tableId: "series", rowId: full.serieId });
  const serieCount = await db.listRows({ databaseId: DATABASE_ID, tableId: "cars", queries: [Query.equal("serieId", full.serieId), Query.limit(1)] });
  check("series.carCount confere", serie.carCount === serieCount.total, `${serie.title}: ${serie.carCount}`);

  // ---------- coleção via Function ----------
  const [carA, carB] = p1.rows;
  const call = async (body) => {
    const exec = await fn.createExecution({
      functionId: "collection", body: JSON.stringify(body), async: false,
      method: ExecutionMethod.POST, headers: { "content-type": "application/json" },
    });
    return { status: exec.responseStatusCode, body: JSON.parse(exec.responseBody || "{}"), ms: Math.round(exec.duration * 1000) };
  };
  const sameSummary = (s, t) => s && s.totalItems === t[0] && s.totalModels === t[1] && s.duplicates === t[2];

  const probe = await call({ action: "set", carId: carA.$id, quantity: 0 }).catch((err) => ({ error: err.type }));
  if (probe.error) {
    check("Function collection executável pelo app", false, `${probe.error}: serviço Functions desligado no console`);
    return;
  }

  let r = await call({ action: "add", carId: carA.$id });
  check("add carro A → qty 1", r.status === 200 && r.body.item?.quantity === 1 && sameSummary(r.body.summary, [1, 1, 0]), `${r.ms} ms`);
  r = await call({ action: "add", carId: carA.$id });
  check("add carro A de novo → qty 2 (repetido)", r.body.item?.quantity === 2 && sameSummary(r.body.summary, [2, 1, 1]), `${r.ms} ms`);
  r = await call({ action: "add", carId: carB.$id });
  check("add carro B → 2 modelos", sameSummary(r.body.summary, [3, 2, 1]), `${r.ms} ms`);
  r = await call({ action: "set", carId: carA.$id, quantity: 150 });
  check("set 150 → limitado a 99", r.body.item?.quantity === 99 && sameSummary(r.body.summary, [100, 2, 1]));
  r = await call({ action: "remove", carId: carA.$id });
  check("remove carro A", r.body.item === null && sameSummary(r.body.summary, [1, 1, 0]));

  const mine = await db.listRows({ databaseId: DATABASE_ID, tableId: "collection_items", queries: [Query.equal("userId", user.$id)] });
  check("lista da coleção (row security, desnormalizada)", mine.total === 1 && mine.rows[0].carTitle === carB.title, mine.rows[0]?.carTitle);
  const stats = await db.getRow({ databaseId: DATABASE_ID, tableId: "user_stats", rowId: user.$id });
  check("user_stats legível pelo dono e correto", sameSummary(stats, [1, 1, 0]), JSON.stringify({ i: stats.totalItems, m: stats.totalModels, d: stats.duplicates }));

  const direct = await db.createRow({ databaseId: DATABASE_ID, tableId: "collection_items", rowId: ID.unique(), data: { userId: user.$id, carId: carA.$id, quantity: 5, carTitle: "x" } })
    .then(() => "gravou").catch((e) => e.code);
  check("app NÃO grava direto em collection_items", direct === 401, direct);
  const forbiddenCar = await db.updateRow({ databaseId: DATABASE_ID, tableId: "cars", rowId: carA.$id, data: { title: "x" } })
    .then(() => "gravou").catch((e) => e.code);
  check("app NÃO altera o catálogo", forbiddenCar === 401, forbiddenCar);

  // ---------- apagar e conferir user-cleanup ----------
  await users.delete({ userId: user.$id });
  created.splice(created.indexOf(user.$id), 1);
  let left = null;
  for (let i = 0; i < 20; i++) {
    await sleep(1500);
    const rows = await adminDb.listRows({ databaseId: DATABASE_ID, tableId: "collection_items", queries: [Query.equal("userId", user.$id)] });
    const st = await adminDb.getRow({ databaseId: DATABASE_ID, tableId: "user_stats", rowId: user.$id }).catch((e) => (isNotFound(e) ? null : e));
    left = { items: rows.total, stats: Boolean(st) };
    if (rows.total === 0 && !st) break;
  }
  check("user-cleanup apagou coleção e stats do usuário", left.items === 0 && !left.stats, JSON.stringify(left));
}

try {
  await run();
} catch (err) {
  check("execução", false, err.message);
} finally {
  for (const userId of created) {
    await users.delete({ userId }).catch(() => {});
  }
  console.table(results);
  console.log("Usuários de teste criados por este script foram apagados.");
}
