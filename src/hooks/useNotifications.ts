import { useSyncExternalStore } from "react";
import { getUnreadNotificationsCount } from "@/services/notifications";

/**
 * Contagem de não lidas — **store de módulo compartilhado** (mesmo
 * padrão de `useCurrentUser`), lida via `useSyncExternalStore`. Não
 * precisa de Provider: o sino do cabeçalho e o item "Notificações" da
 * tela Mais leem o mesmo valor, e a tela da caixa ajusta otimista ao
 * marcar como lida.
 */

type Listener = () => void;
const listeners = new Set<Listener>();
let unreadCount = 0;

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Valor atual, para uso fora de componentes (`NavItem.badge`). */
export function getUnreadNotificationsSnapshot(): number {
  return unreadCount;
}

function setUnreadCount(next: number) {
  if (next === unreadCount) return;
  unreadCount = next;
  emit();
}

/** Busca a contagem no servidor e atualiza todo mundo que lê o hook. */
export async function refreshUnreadNotifications(): Promise<void> {
  try {
    setUnreadCount(await getUnreadNotificationsCount());
  } catch {
    // Não crítico — mantém o último valor conhecido.
  }
}

/** Ajuste otimista (1 notificação marcada como lida), sem novo fetch. */
export function decrementUnreadNotifications(by = 1) {
  setUnreadCount(Math.max(0, unreadCount - by));
}

/** Ajuste otimista de "marcar todas como lidas" e do logout. */
export function clearUnreadNotifications() {
  setUnreadCount(0);
}

/** Contagem de não lidas, reativa (sino do cabeçalho, item da tela Mais). */
export function useUnreadNotificationsCount(): number {
  return useSyncExternalStore(subscribe, getUnreadNotificationsSnapshot, getUnreadNotificationsSnapshot);
}
