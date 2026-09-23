/**
 * Inspeção SOMENTE LEITURA da origem da migração (Postgres + RustFS).
 * A sessão Postgres abre com default_transaction_read_only=on: qualquer
 * INSERT/UPDATE/DELETE/DDL é recusado pelo próprio servidor.
 * No S3 só usamos ListBuckets e ListObjectsV2.
 *
 *   npm run inspect-source
 */
import pg from "pg";
import { S3Client, ListBucketsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

const env = process.env;
const client = new pg.Client({
  host: env.SOURCE_PG_HOST,
  port: Number(env.SOURCE_PG_PORT),
  database: env.SOURCE_PG_DATABASE,
  user: env.SOURCE_PG_USER,
  password: env.SOURCE_PG_PASSWORD,
  options: "-c default_transaction_read_only=on",
  connectionTimeoutMillis: 15000,
});

await client.connect();
const q = async (sql, params) => (await client.query(sql, params)).rows;
console.log("read_only:", (await q("show default_transaction_read_only"))[0]);
console.log("versão:", (await q("select version()"))[0].version);

const tables = await q(`
  select table_schema, table_name
  from information_schema.tables
  where table_type = 'BASE TABLE' and table_schema not in ('pg_catalog','information_schema')
  order by 1, 2`);
for (const t of tables) {
  const full = `"${t.table_schema}"."${t.table_name}"`;
  const [{ n }] = await q(`select count(*)::int as n from ${full}`);
  const cols = await q(
    `select column_name, data_type, is_nullable, column_default
     from information_schema.columns where table_schema=$1 and table_name=$2 order by ordinal_position`,
    [t.table_schema, t.table_name]);
  const idx = await q(`select indexdef from pg_indexes where schemaname=$1 and tablename=$2`, [t.table_schema, t.table_name]);
  console.log(`\n### ${full} — ${n} linhas`);
  for (const c of cols) console.log(`  ${c.column_name}: ${c.data_type}${c.is_nullable === "NO" ? " NOT NULL" : ""}${c.column_default ? ` = ${c.column_default}` : ""}`);
  for (const i of idx) console.log(`  idx: ${i.indexdef}`);
}
await client.end();

const s3 = new S3Client({
  endpoint: env.SOURCE_S3_ENDPOINT,
  region: "us-east-1",
  forcePathStyle: true,
  credentials: { accessKeyId: env.SOURCE_S3_ACCESS_KEY, secretAccessKey: env.SOURCE_S3_SECRET_KEY },
});
const { Buckets = [] } = await s3.send(new ListBucketsCommand({}));
console.log("\n### RustFS buckets:", Buckets.map((b) => b.Name).join(", "));
for (const b of Buckets) {
  let token, count = 0, bytes = 0;
  const sample = [];
  const exts = {};
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: b.Name, ContinuationToken: token }));
    for (const o of page.Contents ?? []) {
      count++; bytes += o.Size ?? 0;
      const ext = (o.Key.match(/\.([a-z0-9]+)$/i)?.[1] ?? "(sem)").toLowerCase();
      exts[ext] = (exts[ext] ?? 0) + 1;
      if (sample.length < 8) sample.push(`${o.Key} (${o.Size} B)`);
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  console.log(`  ${b.Name}: ${count} objetos, ${(bytes / 1048576).toFixed(1)} MB, extensões ${JSON.stringify(exts)}`);
  for (const s of sample) console.log(`    ${s}`);
}
