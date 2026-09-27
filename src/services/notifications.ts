import { api } from "./_http";
import type { NotificationItem } from "@/types";

/**
 * Caixa de notificações e registro do push token — backend próprio,
 * rotas `/v2/notifications` e `/v2/me/push-token` (`docs/API-V2.md`,
 * contrato confirmado pelo Alicerce em 27/09/2026). Tudo aqui exige
 * sessão (JWT), sem exceção.
 */

type ApiNotification = {
  id: string;
  title: string;
  body: string;
  read: boolean;
  type: string;
  targetId: string | null;
  createdAt: string;
};

type ApiPage<T> = { items: T[]; total: number | null; nextCursor: string | null };

function apiToItem(n: ApiNotification): NotificationItem {
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    read: n.read,
    type: n.type,
    targetId: n.targetId,
    createdAt: n.createdAt,
  };
}

export interface PaginatedNotifications {
  items: NotificationItem[];
  total: number | null;
  nextCursor: string | null;
}

/** Caixa paginada por cursor, mais recentes primeiro. */
export async function listNotificationsPaged(
  options: { cursor?: string; pageSize?: number } = {}
): Promise<PaginatedNotifications> {
  const page = await api<ApiPage<ApiNotification>>("/v2/notifications", {
    query: { cursor: options.cursor, limit: options.pageSize ?? 20 },
  });
  return { items: page.items.map(apiToItem), total: page.total, nextCursor: page.nextCursor };
}

/** Contagem de não lidas — mais leve que paginar a caixa inteira. */
export async function getUnreadNotificationsCount(): Promise<number> {
  const res = await api<{ count: number }>("/v2/notifications/unread-count");
  return res.count ?? 0;
}

/** Marca uma notificação como lida. */
export async function markNotificationRead(id: string): Promise<void> {
  await api(`/v2/notifications/${encodeURIComponent(id)}/read`, { method: "POST" });
}

/** Marca toda a caixa como lida. */
export async function markAllNotificationsRead(): Promise<void> {
  await api("/v2/notifications/read-all", { method: "PATCH" });
}

/** Registra (ou atualiza o dono/timestamp de) um push token do Expo. */
export async function registerPushToken(token: string): Promise<void> {
  await api("/v2/me/push-token", { method: "POST", body: { token } });
}

/** Remove o push token deste aparelho (logout). */
export async function unregisterPushToken(token: string): Promise<void> {
  await api("/v2/me/push-token", { method: "DELETE", body: { token } });
}
