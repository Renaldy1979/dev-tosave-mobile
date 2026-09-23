import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCurrentUser, signIn, signOut, type SignInResult } from "@/services/auth";
import type { User } from "@/types";

const SESSION_FLAG_KEY = "tosave.session";

/**
 * Sessão atual do app. Lê o service (in-memory) no mount e se
 * inscreve para revalidação depois de `signIn`/`signOut`. Mantém um
 * `useState` local porque o service de auth é módulo-singleton — não
 * emite eventos por si só.
 *
 * Na fase 2 esse hook troca para um `SessionProvider` com Context
 * (consumido pelo `useRequireSession`); a forma (`{ user: User | null }`)
 * fica igual.
 */
export function useCurrentUser(): {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
} {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const next = await getCurrentUser();
    setUser(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signInAndSync = useCallback(
    async (email: string, password: string) => {
      const result = await signIn(email, password);
      if (result.ok) {
        setUser(result.user);
        // Marca no storage que há sessão para o splash decidir destino
        // sem ter que esperar a primeira chamada a `getCurrentUser`.
        await AsyncStorage.setItem(SESSION_FLAG_KEY, "1").catch(() => undefined);
      }
      return result;
    },
    []
  );

  const signOutAndSync = useCallback(async () => {
    await signOut();
    setUser(null);
    await AsyncStorage.removeItem(SESSION_FLAG_KEY).catch(() => undefined);
  }, []);

  return { user, loading, signIn: signInAndSync, signOut: signOutAndSync, refresh };
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
