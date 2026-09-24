/**
 * Backfill de collection_items.carAttributeIds a partir de cars.attributeIds.
 *
 * Grava SÓ a coluna carAttributeIds (updateRow com esse único campo):
 * quantity, itens, user_stats e as demais colunas não são tocados.
 * Idempotente: só atualiza linhas cujo valor difere.
 *
 *   npm run collection-attr-backfill [-- --dry-run]
 */
import { Query } from "node-appwrite";
import { tablesDB, DATABASE_ID } from "../lib/appwrite.mjs";

const dryRun = process.argv.includes("--dry-run");

async function listAll(tableId, queries) {
  const rows = [];
  let cursor = null;
  for (;;) {
    const page = await tablesDB.listRows({
      databaseId: DATABASE_ID, tableId, total: false,
      queries: [...queries, Query.limit(1000), Query.orderAsc("$id"), ...(cursor ? [Query.cursorAfter(cursor)] : [])],
    });
    rows.push(...page.rows);
    if (page.rows.length < 1000) return rows;
    cursor = page.rows.at(-1).$id;
  }
}

const items = await listAll("collection_items", [Query.select(["$id", "carId", "carAttributeIds"])]);
const carIds = [...new Set(items.map((i) => i.carId))];
const attrsByCar = new Map();
for (let i = 0; i < carIds.length; i += 100) {
  const { rows } = await tablesDB.listRows({
    databaseId: DATABASE_ID, tableId: "cars", total: false,
    queries: [Query.equal("$id", carIds.slice(i, i + 100)), Query.select(["$id", "attributeIds"]), Query.limit(100)],
  });
  for (const c of rows) attrsByCar.set(c.$id, c.attributeIds ?? []);
}

const same = (a = [], b = []) => a.length === b.length && [...a].sort().join() === [...b].sort().join();
let changed = 0;
let withAttrs = 0;
for (const it of items) {
  const attrs = attrsByCar.get(it.carId) ?? [];
  if (attrs.length) withAttrs++;
  if (same(it.carAttributeIds ?? [], attrs)) continue;
  if (!dryRun) await tablesDB.updateRow({ databaseId: DATABASE_ID, tableId: "collection_items", rowId: it.$id, data: { carAttributeIds: attrs } });
  changed++;
}
console.log(`collection_items: ${items.length} linhas, ${withAttrs} com atributos, ${changed} atualizadas${dryRun ? " (dry-run)" : ""}`);
