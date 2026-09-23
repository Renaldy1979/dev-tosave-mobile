/**
 * Espelho em memória da sessão — usado pelo `useCurrentUser` para
 * reatividade imediata após signIn/signOut.
 *
 * A persistência real fica com o client Appwrite; este arquivo só
 * mantém a ponte de eventos entre `services/auth.ts` e os hooks.
 */
import type { User } from "@/types";

type Session = { user: User | null };

let current: Session = { user: null };
const listeners = new Set<(next: Session) => void>();

export function getCurrentSession(): Session {
  return current;
}

export function setCurrentSession(next: Session) {
  current = next;
  for (const l of listeners) l(next);
}

export function subscribeSession(listener: (next: Session) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * `silentSignOut` — chamado pelo handler de `unauthorized` quando o
 * Appwrite devolve 401. Limpa o espelho e os listeners sem fazer chamada
 * de rede (a sessão já morreu do lado do servidor).
 */
export function silentSignOut() {
  setCurrentSession({ user: null });
}
