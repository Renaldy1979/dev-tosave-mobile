/**
 * Levantamento SOMENTE LEITURA das coleções e dos usuários da origem,
 * para planejar a importação (users.createBcryptUser + collection_items).
 * E-mails saem mascarados; hashes nunca são impressos (só o prefixo).
 *
 *   npm run survey-collections
 */
import pg from "pg";

const e = process.env;
const c = new pg.Client({
  host: e.SOURCE_PG_HOST,
  port: Number(e.SOURCE_PG_PORT),
  database: e.SOURCE_PG_DATABASE,
  user: e.SOURCE_PG_USER,
  password: e.SOURCE_PG_PASSWORD,
  options: "-c default_transaction_read_only=on",
});

const mask = (email) => {
  const [local, domain = ""] = String(email).split("@");
  return `${local.slice(0, 2)}***@${domain.replace(/^[^.]+/, (d) => d[0] + "***")}`;
};

await c.connect();
const q = async (sql) => (await c.query(sql)).rows;

console.log("## Tabelas com 'collection' no nome");
console.table(await q(`select table_name from information_schema.tables
  where table_schema = 'public' and table_name ilike '%collection%'`));

for (const t of ["collections", "users"]) {
  console.log(`\n## Colunas de ${t}`);
  console.table(await q(`select column_name, data_type, is_nullable, column_default
    from information_schema.columns where table_schema = 'public' and table_name = '${t}'
    order by ordinal_position`));
}

console.log("\n## Formato do hash de senha");
console.table(await q(`select left(password_hash, 4) prefixo, length(password_hash) tamanho,
  substring(password_hash from 5 for 2) custo, count(*)::int usuarios
  from users group by 1, 2, 3 order by 4 desc`));

console.log("\n## Usuários");
console.table(await q(`select count(*)::int total,
  count(*) filter (where is_active)::int ativos,
  count(*) filter (where role = 'admin')::int admins,
  count(distinct lower(email))::int emails_distintos,
  count(*) filter (where email !~ '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$')::int emails_invalidos,
  max(length(name))::int nome_max
  from users`));

console.log("\n## Coleções");
console.table(await q(`select count(*)::int itens, count(distinct user_id)::int usuarios_com_colecao,
  sum(quantity)::int unidades, count(*) filter (where quantity > 1)::int repetidos,
  min(quantity)::int qmin, max(quantity)::int qmax,
  count(*) filter (where quantity < 1 or quantity > 99)::int fora_da_faixa
  from collections`));

console.log("\n## Top 10 usuários por itens");
const top = await q(`select u.email, u.is_active, u.role, count(c.*)::int modelos, sum(c.quantity)::int unidades
  from collections c left join users u on u.id = c.user_id
  group by u.email, u.is_active, u.role order by modelos desc limit 10`);
console.table(top.map((r) => ({ ...r, email: r.email ? mask(r.email) : "(sem usuário)" })));

console.log("\n## Órfãos");
console.table(await q(`select
  (select count(*) from collections c left join cars x on x.id = c.car_id where x.id is null)::int car_orfao,
  (select count(*) from collections c left join users u on u.id = c.user_id where u.id is null)::int usuario_orfao,
  (select count(*) from (select user_id, car_id from collections group by 1, 2 having count(*) > 1) d)::int pares_duplicados`));

await c.end();
