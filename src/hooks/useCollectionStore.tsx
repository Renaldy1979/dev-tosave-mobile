import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  addToCollection,
  getCollectionSummary,
  removeFromCollection,
  setCollectionQuantity,
  type CollectionMutationResult,
} from "@/services/collection";
import { useCurrentUser } from "./useCurrentUser";
import type { CollectionSummary } from "@/types";

/**
 * Coleção no app — sem espelho da coleção.
 *
 * A posse de cada carro vem no próprio item de cada lista (`quantity`,
 * API v2). Este contexto guarda só:
 * - o **resumo** (`/v2/collection/summary`), buscado ao abrir Home,
 *   Coleção e Estatísticas (`refreshSummary`) e atualizado pelo retorno
 *   de cada add/PUT/DELETE;
 * - as **mudanças desta sessão** (`carId → quantidade`): depois de um
 *   toque, a tela atualiza só aquele card, e outra tela aberta mostra o
 *   mesmo estado sem recarregar a lista (`quantityOf`).
 *
 * Escritas em fila, uma por vez: o stepper manda quantidades absolutas
 * (PUT) e a ordem garante que vale o último toque.
 */
type CollectionContextValue = {
  summary: CollectionSummary;
  /** O resumo já carregou ao menos uma vez. */
  loaded: boolean;
  /** A última carga do resumo falhou. */
  error: boolean;
  /** Incrementa a cada mudança (para `extraData` das listas). */
  version: number;
  refreshSummary: () => Promise<void>;
  /** Quantidade efetiva: a mudança desta sessão, ou a que veio no item. */
  quantityOf: (car: { id: string; quantity?: number }) => number;
  /** `false` quando o toque foi ignorado (já há um pedido do mesmo carro). */
  toggle: (carId: string, current: number) => Promise<boolean>;
  setQuantity: (carId: string, current: number, quantity: number) => Promise<void>;
  remove: (carId: string, current: number) => Promise<void>;
};

const emptySummary: CollectionSummary = { totalItems: 0, totalModels: 0, duplicates: 0 };

/** Resumo depois de um carro ir de `prev` para `next` unidades (otimista). */
function applyDelta(s: CollectionSummary, prev: number, next: number): CollectionSummary {
  return {
    totalItems: Math.max(0, s.totalItems + next - prev),
    totalModels: Math.max(0, s.totalModels + (next > 0 ? 1 : 0) - (prev > 0 ? 1 : 0)),
    duplicates: Math.max(0, s.duplicates + (next > 1 ? 1 : 0) - (prev > 1 ? 1 : 0)),
  };
}

const CollectionContext = createContext<CollectionContextValue | null>(null);

export function CollectionProvider({ children }: { children: ReactNode }) {
  const { user } = useCurrentUser();
  const [summary, setSummary] = useState<CollectionSummary>(emptySummary);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [changes, setChanges] = useState<Record<string, number>>({});
  const [version, setVersion] = useState(0);

  const refreshSummary = useCallback(async () => {
    if (!user) return;
    try {
      setSummary(await getCollectionSummary());
      setError(false);
    } catch (err) {
      setError(true);
      throw err;
    } finally {
      setLoaded(true);
    }
  }, [user]);

  // Troca de usuário: zera resumo e mudanças.
  useEffect(() => {
    setSummary(emptySummary);
    setChanges({});
    setLoaded(false);
    setError(false);
  }, [user?.id]);

  const quantityOf = useCallback(
    (car: { id: string; quantity?: number }) => changes[car.id] ?? car.quantity ?? 0,
    [changes]
  );

  const setLocal = useCallback((carId: string, quantity: number) => {
    setChanges((cur) => ({ ...cur, [carId]: quantity }));
    setVersion((v) => v + 1);
  }, []);

  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const enqueue = useCallback(<T,>(fn: () => Promise<T>): Promise<T> => {
    const run = queueRef.current.then(fn, fn);
    queueRef.current = run.catch(() => undefined);
    return run;
  }, []);

  /** Escrita otimista: card e resumo na hora; depois o que o servidor devolveu. */
  const write = useCallback(
    async (carId: string, prev: number, next: number, call: () => Promise<CollectionMutationResult>, failure: string) => {
      if (!user) throw new Error(failure);
      setLocal(carId, next);
      setSummary((s) => applyDelta(s, prev, next));
      try {
        const res = await enqueue(call);
        setLocal(carId, res.item?.quantity ?? 0);
        setSummary(res.summary);
      } catch {
        setLocal(carId, prev);
        setSummary((s) => applyDelta(s, next, prev));
        throw new Error(failure);
      }
    },
    [user, setLocal, enqueue]
  );

  // Toques repetidos no mesmo coração enquanto o pedido anterior está
  // na fila são ignorados (o otimista já mostra o estado pedido).
  const pendingToggles = useRef(new Set<string>());

  const toggle = useCallback(
    async (carId: string, current: number): Promise<boolean> => {
      if (pendingToggles.current.has(carId)) return false;
      pendingToggles.current.add(carId);
      try {
        const wasIn = current > 0;
        await write(
          carId,
          current,
          wasIn ? 0 : 1,
          () => (wasIn ? removeFromCollection(carId) : addToCollection(carId)),
          "collection_toggle_failed"
        );
        return true;
      } finally {
        pendingToggles.current.delete(carId);
      }
    },
    [write]
  );

  const setQuantity = useCallback(
    (carId: string, current: number, quantity: number) =>
      write(carId, current, Math.max(0, quantity), () => setCollectionQuantity(carId, quantity), "collection_set_failed"),
    [write]
  );

  const remove = useCallback(
    (carId: string, current: number) =>
      write(carId, current, 0, () => removeFromCollection(carId), "collection_remove_failed"),
    [write]
  );

  const value = useMemo<CollectionContextValue>(
    () => ({ summary, loaded, error, version, refreshSummary, quantityOf, toggle, setQuantity, remove }),
    [summary, loaded, error, version, refreshSummary, quantityOf, toggle, setQuantity, remove]
  );

  return <CollectionContext.Provider value={value}>{children}</CollectionContext.Provider>;
}

export function useCollectionStore() {
  const ctx = useContext(CollectionContext);
  if (!ctx) throw new Error("useCollectionStore precisa estar dentro de <CollectionProvider>.");
  return ctx;
}
