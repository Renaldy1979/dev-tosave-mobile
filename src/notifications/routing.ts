import type { Href } from "expo-router";

/**
 * Rota do toque numa notificação (push ou item da caixa), a partir de
 * `type`/`targetId` — os dois vêm com os mesmos valores no payload do
 * push (`data`) e no item da caixa (`/v2/notifications`), de propósito,
 * pra usar a mesma lógica nos dois casos.
 *
 * `"news"` é o único tipo por enquanto; mais tipos chegam no lote 3
 * (Clube da Troca).
 */
export function notificationRoute(type: string, targetId: string | null): Href | null {
  switch (type) {
    case "news":
      return targetId ? (`/noticia/${targetId}` as Href) : null;
    default:
      return null;
  }
}
