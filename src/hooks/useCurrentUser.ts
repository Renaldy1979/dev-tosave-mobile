import { useCallback, useSyncExternalStore } from "react";
import {
  getCurrentUser,
  signIn as serviceSignIn,
  signOut as serviceSignOut,
  subscribeAuth,
  bindUnauthorizedHandler,
  type SignInResult,
} from "@/services/auth";
import { silentSignOut } from "@/services/_session";
import type { User } from "@/types";

/**
 * Sessão atual do app — **store de módulo compartilhado** entre todas
 * as instâncias do hook (lido via `useSyncExternalStore`).
 *
 * Fase 2: o client Appwrite persiste a sessão sozinho; este hook é o
 * espelho de reatividade que dispara `useSyncExternalStore` quando há
 * mudança local (signIn/signOut dentro do app).
 *
 * A API pública do hook é a mesma da fase 1:
 * `{ user, loading, signIn, signOut, refresh }`.
 */

type Listener = () => void;
const listeners = new Set<Listener>();
let snapshot: { user: User | null; loading: boolean } = {
  user: null,
  loading: true,
};

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return snapshot;
}

function getServerSnapshot() {
  return snapshot;
}

function setSnapshot(next: { user: User | null; loading: boolean }) {
  if (next === snapshot) return;
  snapshot = next;
  emit();
}

let bootstrapStarted = false;
async function ensureBootstrap() {
  if (bootstrapStarted) return;
  bootstrapStarted = true;
  // 1ª carga: o cliente Appwrite pode já ter sessão (do restart do
  // app). `getCurrentUser` consulta o espelho em memória (vazio após
  // boot) e cai para `account.get()`.
  await refreshUser();
  // Liga o callback de unauthorized — quando o Appwrite devolve 401
  // em qualquer chamada autenticada, o app volta ao Login. Ligar uma
  // vez só.
  bindUnauthorizedHandler(() => {
    silentSignOut();
    setSnapshot({ user: null, loading: false });
  });
}

ensureBootstrap();

async function refreshUser() {
  try {
    const user = await getCurrentUser();
    setSnapshot({ user, loading: false });
  } catch {
    setSnapshot({ user: null, loading: false });
  }
}

async function signInAndSync(
  email: string,
  password: string
): Promise<SignInResult> {
  const result = await serviceSignIn(email, password);
  if (result.ok) {
    setSnapshot({ user: result.user, loading: false });
  }
  return result;
}

async function signOutAndSync() {
  await serviceSignOut();
  setSnapshot({ user: null, loading: false });
}

// Encaminha o `subscribeAuth` do service para os listeners do store.
subscribeAuth(() => {
  // No-op: o store já mantém o espelho e atualiza via `setSnapshot`
  // dentro dos handlers. O `subscribeAuth` é usado por consumidores
  // que queiram reagir fora do hook principal.
});

export function useCurrentUser(): {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
} {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const signInFn = useCallback(
    async (email: string, password: string) => signInAndSync(email, password),
    []
  );
  const signOutFn = useCallback(async () => {
    await signOutAndSync();
  }, []);
  const refreshFn = useCallback(async () => {
    await refreshUser();
  }, []);
  return {
    user: snap.user,
    loading: snap.loading,
    signIn: signInFn,
    signOut: signOutFn,
    refresh: refreshFn,
  };
}

/**
 * Lê só a flag de "houve sessão" no AsyncStorage. Mantida para o splash.
 */
export async function readSessionFlag(): Promise<boolean> {
  const { readSessionFlag: readFlag } = await import("@/utils/sessionFlag");
  return readFlag();
}
