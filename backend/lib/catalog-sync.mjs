/**
 * Controle da Function `catalog-sync` durante cargas em lote.
 *
 * Desligar a Function NÃO descarta os eventos: o Appwrite continua
 * enfileirando cada linha alterada e processa tudo quando ela volta
 * (visto no upload das fotos: ~16 mil execuções atrasadas). Por isso a
 * pausa tira a ASSINATURA de eventos, e a retomada a restaura.
 */
import { functions } from "./appwrite.mjs";

const DB_EVENTS = (table) => ["create", "update", "delete"].map((a) => `databases.tosave.tables.${table}.rows.*.${a}`);

/** Eventos oficiais da catalog-sync (usado também pelo deploy). */
export const CATALOG_SYNC_EVENTS = [...DB_EVENTS("cars"), ...DB_EVENTS("series"), ...DB_EVENTS("brands")];

/** paused=true: sem eventos e desligada; paused=false: eventos oficiais e ligada. */
export async function pauseCatalogSync(paused) {
  const f = await functions.get({ functionId: "catalog-sync" });
  await functions.update({
    functionId: f.$id, name: f.name, runtime: f.runtime, execute: f.execute,
    events: paused ? [] : CATALOG_SYNC_EVENTS,
    schedule: f.schedule, timeout: f.timeout, enabled: !paused, logging: f.logging,
    entrypoint: f.entrypoint, commands: f.commands, scopes: f.scopes,
  });
  console.log(paused ? "catalog-sync pausada (sem eventos) durante a carga" : "catalog-sync retomada (eventos restaurados)");
}
