/**
 * Checagem SOMENTE LEITURA do Appwrite: versão, databases, tabelas,
 * buckets, usuários, times, functions e scopes da API key.
 * Não cria, altera nem apaga nada.
 *
 *   npm run check
 */
import { Client, TablesDB, Storage, Users, Teams, Functions, Query } from "node-appwrite";

const { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY } = process.env;
if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
  console.error("Faltam variáveis em backend/.env.local");
  process.exit(1);
}

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY);

async function step(label, fn) {
  try {
    const out = await fn();
    console.log(`\n## ${label}`);
    console.log(typeof out === "string" ? out : JSON.stringify(out, null, 2));
  } catch (err) {
    console.log(`\n## ${label}\nERRO ${err.code ?? ""} ${err.type ?? ""}: ${err.message}`);
  }
}

// Scopes: o endpoint de health devolve o header x-appwrite-... não traz scopes;
// o erro 401 de cada serviço mostra o scope que falta. Além disso tentamos
// ler a própria key pelo endpoint de projeto (só funciona com console).
await step("Versão", async () => {
  const res = await fetch(`${APPWRITE_ENDPOINT}/health/version`);
  return (await res.json()).version;
});

const tablesDB = new TablesDB(client);
await step("Databases", async () => {
  const { total, databases } = await tablesDB.list();
  const out = { total, databases: [] };
  for (const db of databases) {
    const { tables } = await tablesDB.listTables({ databaseId: db.$id });
    out.databases.push({ id: db.$id, name: db.name, tables: tables.map((t) => t.$id) });
  }
  return out;
});

await step("Buckets", async () => {
  const { total, buckets } = await new Storage(client).listBuckets();
  return {
    total,
    buckets: buckets.map((b) => ({
      id: b.$id, name: b.name, maximumFileSize: b.maximumFileSize,
      allowedFileExtensions: b.allowedFileExtensions, compression: b.compression,
      encryption: b.encryption, antivirus: b.antivirus, fileSecurity: b.fileSecurity,
    })),
  };
});

await step("Usuários", async () => {
  const { total, users } = await new Users(client).list({ queries: [Query.limit(10)] });
  return { total, amostra: users.map((u) => ({ id: u.$id, name: u.name, labels: u.labels, status: u.status })) };
});

await step("Times", async () => {
  const { total, teams } = await new Teams(client).list();
  return { total, teams: teams.map((t) => ({ id: t.$id, name: t.name, total: t.total })) };
});

await step("Functions", async () => {
  const { total, functions } = await new Functions(client).list();
  return { total, functions: functions.map((f) => ({ id: f.$id, name: f.name, runtime: f.runtime, events: f.events })) };
});

await step("Runtimes disponíveis", async () => {
  const { runtimes } = await new Functions(client).listRuntimes();
  return runtimes.map((r) => r.$id).filter((id) => id.startsWith("node")).join(", ");
});
