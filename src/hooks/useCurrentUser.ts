import { useCallback, useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCurrentUser, signIn, signOut, type SignInResult } from "@/services/auth";
import type { User } from "@/types";

const SESSION_FLAG_KEY = "tosave.session";

/**
 * Sessão atual do app — **store de módulo compartilhado** entre todas
 * as instâncias do hook.
 *
 * Bug da fase 1: cada componente que chamava `useCurrentUser()` tinha
 * o seu próprio `useState`, então o `signIn` feito dentro do modal de
 * login não chegava ao `CollectionProvider` montado no root. O store
 * ficava com `user = null`, o que tornava a Coleção sempre vazia após o
 * login.
 *
 * Correção: um único `state` no escopo do módulo, lido via
 * `useSyncExternalStore` (re-renderiza todos os consumidores quando
 * muda). A API pública do hook é a mesma — `{ user, loading, signIn,
 * signOut, refresh }` — então nenhum consumidor precisa mudar.
 *
 * `signIn` e `signOut` ficam expostos pelo hook mas operam no store
 * global. `refresh` continua existindo para sincronização sob demanda.
 */
type Listener = () => void;

let state: { user: User | null; loading: boolean } = {
  user: null,
  loading: true,
};

const listeners = new Set<Listener>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state;
}

function getServerSnapshot() {
  return state;
}

function setState(next: { user: User | null; loading: boolean }) {
  if (next === state) return;
  state = next;
  emit();
}

/**
 * Dispara o carregamento inicial da sessão. Idempotente — só corre uma
 * vez por módulo.
 */
let bootstrapStarted = false;
function ensureBootstrap() {
  if (bootstrapStarted) return;
  bootstrapStarted = true;
  void (async () => {
    try {
      const user = await getCurrentUser();
      setState({ user, loading: false });
    } catch {
      setState({ user: null, loading: false });
    }
  })();
}

ensureBootstrap();

async function refreshUser(): Promise<void> {
  try {
    const user = await getCurrentUser();
    setState({ user, loading: false });
  } catch {
    setState({ user: null, loading: false });
  }
}

async function signInAndSync(
  email: string,
  password: string
): Promise<SignInResult> {
  const result = await signIn(email, password);
  if (result.ok) {
    setState({ user: result.user, loading: false });
    try {
      await AsyncStorage.setItem(SESSION_FLAG_KEY, "1");
    } catch {
      // ignora
    }
  }
  return result;
}

async function signOutAndSync(): Promise<void> {
  await signOut();
  setState({ user: null, loading: false });
  try {
    await AsyncStorage.removeItem(SESSION_FLAG_KEY);
  } catch {
    // ignora
  }
}

/**
 * Hook público. Mantém a mesma assinatura da fase 1 para que os
 * consumidores não mudem.
 */
export function useCurrentUser(): {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
} {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
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
    user: snapshot.user,
    loading: snapshot.loading,
    signIn: signInFn,
    signOut: signOutFn,
    refresh: refreshFn,
  };
}

/**
 * Lê só a flag de "houve sessão" no AsyncStorage. Usado pelo splash
 * decidir destino sem precisar instanciar o service (mais barato).
 */
export async function readSessionFlag(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(SESSION_FLAG_KEY);
    return value === "1";
  } catch {
    return false;
  }
}
