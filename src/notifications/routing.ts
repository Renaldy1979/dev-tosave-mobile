import type { Href } from "expo-router";

/**
 * Rota do toque numa notificação (push ou item da caixa), a partir de
 * `type`/`targetId` — os dois vêm com os mesmos valores no payload do
 * push (`data`) e no item da caixa (`/v2/notifications`), de propósito,
 * pra usar a mesma lógica nos dois casos.
 *
 * `"news"` (lote 1) e `"trade_match"`/`"trade_interest"` (lote 3, Clube
 * da Troca) — mais tipos "admin_broadcast" (sem alvo) caem no `default`.
 */
export function notificationRoute(type: string, targetId: string | null): Href | null {
  if (!targetId) return null;
  switch (type) {
    case "news":
      return `/noticia/${targetId}` as Href;
    case "trade_match":
    case "trade_interest":
      return `/anuncio/${targetId}` as Href;
    default:
      return null;
  }
}
