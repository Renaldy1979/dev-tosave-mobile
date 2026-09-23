import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  addToCollection,
  getCollection,
  getCollectionSummary,
  removeFromCollection,
  setCollectionQuantity,
} from "@/services/collection";
import { useCurrentUser } from "./useCurrentUser";
import type { CollectionSummary } from "@/types";

/**
 * Store compartilhado da coleção (`docs/ESPECIFICACAO-MOBILE.md` — store
 * leve com mapa `carId → quantity`). O coração dos cards (Home, Busca,
 * Detalhe), o painel da Coleção e o badge da TabBar leem daqui, então
 * a contagem e o estado de cada item ficam coerentes sem precisar de
 * fetch em cada tela.
 *
 * Carregamento inicial: ao logar ou montar, faz `getCollection(userId)`
 * e popula o mapa + summary. Operações (`add`, `remove`, `setQuantity`,
 * `toggle`) atualizam o store otimista e revalidam com o service.
 */
type CollectionState = {
  /** Mapa `carId → quantity` (0 quando não está na coleção). */
  items: Record<string, number>;
  /** Total de unidades e modelos para o badge e o resumo. */
  summary: CollectionSummary;
  /** Versão do store (incrementa a cada mutação), para forçar re-render. */
  version: number;
  /** Usado pela UI: nada a exibir enquanto carrega a primeira vez. */
  loaded: boolean;
};

type CollectionActions = {
  toggle: (carId: string) => Promise<void>;
  setQuantity: (carId: string, quantity: number) => Promise<void>;
  remove: (carId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

const emptySummary: CollectionSummary = { totalItems: 0, totalModels: 0, duplicates: 0 };

const CollectionContext = createContext<(CollectionState & CollectionActions) | null>(null);

export function CollectionProvider({ children }: { children: ReactNode }) {
  const { user } = useCurrentUser();
  const [items, setItems] = useState<Record<string, number>>({});
  const [summary, setSummary] = useState<CollectionSummary>(emptySummary);
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const recomputeSummary = useCallback((next: Record<string, number>) => {
    const values = Object.values(next);
    const totalItems = values.reduce((sum, q) => sum + q, 0);
    const totalModels = values.filter((q) => q > 0).length;
    const duplicates = values.filter((q) => q > 1).length;
    return { totalItems, totalModels, duplicates };
  }, []);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems({});
      setSummary(emptySummary);
      setLoaded(true);
      return;
    }
    try {
      const [list, sum] = await Promise.all([
        getCollection(user.id),
        getCollectionSummary(user.id),
      ]);
      const map: Record<string, number> = {};
      list.forEach((it) => {
        map[it.carId] = it.quantity;
      });
      setItems(map);
      setSummary(sum);
      setLoaded(true);
    } catch {
      setLoaded(true);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggle = useCallback(
    async (carId: string) => {
      if (!user) return;
      const previous = items[carId] ?? 0;
      const next = previous > 0 ? 0 : 1;
      // Otimista
      setItems((cur) => {
        const updated = { ...cur };
        if (next === 0) delete updated[carId];
        else updated[carId] = next;
        setSummary(recomputeSummary(updated));
        return updated;
      });
      setVersion((v) => v + 1);
      try {
        if (next === 0) {
          await removeFromCollection(user.id, carId);
        } else {
          await addToCollection(user.id, carId);
        }
      } catch {
        // rollback
        setItems((cur) => {
          const updated = { ...cur };
          if (previous === 0) delete updated[carId];
          else updated[carId] = previous;
          setSummary(recomputeSummary(updated));
          return updated;
        });
        setVersion((v) => v + 1);
        throw new Error("collection_toggle_failed");
      }
    },
    [user, items, recomputeSummary]
  );

  const setQuantityAction = useCallback(
    async (carId: string, quantity: number) => {
      if (!user) return;
      const previous = items[carId] ?? 0;
      // Otimista
      setItems((cur) => {
        const updated = { ...cur };
        if (quantity <= 0) delete updated[carId];
        else updated[carId] = quantity;
        setSummary(recomputeSummary(updated));
        return updated;
      });
      setVersion((v) => v + 1);
      try {
        await setCollectionQuantity(user.id, carId, quantity);
      } catch {
        // rollback
        setItems((cur) => {
          const updated = { ...cur };
          if (previous <= 0) delete updated[carId];
          else updated[carId] = previous;
          setSummary(recomputeSummary(updated));
          return updated;
        });
        setVersion((v) => v + 1);
        throw new Error("collection_set_failed");
      }
    },
    [user, items, recomputeSummary]
  );

  const removeAction = useCallback(
    async (carId: string) => {
      if (!user) return;
      const previous = items[carId] ?? 0;
      // Otimista
      setItems((cur) => {
        const updated = { ...cur };
        delete updated[carId];
        setSummary(recomputeSummary(updated));
        return updated;
      });
      setVersion((v) => v + 1);
      try {
        await removeFromCollection(user.id, carId);
      } catch {
        setItems((cur) => {
          const updated = { ...cur };
          if (previous > 0) updated[carId] = previous;
          setSummary(recomputeSummary(updated));
          return updated;
        });
        setVersion((v) => v + 1);
        throw new Error("collection_remove_failed");
      }
    },
    [user, items, recomputeSummary]
  );

  const value = useMemo(
    () => ({
      items,
      summary,
      version,
      loaded,
      toggle,
      setQuantity: setQuantityAction,
      remove: removeAction,
      refresh,
    }),
    [items, summary, version, loaded, toggle, setQuantityAction, removeAction, refresh]
  );

  return <CollectionContext.Provider value={value}>{children}</CollectionContext.Provider>;
}

export function useCollectionStore() {
  const ctx = useContext(CollectionContext);
  if (!ctx) throw new Error("useCollectionStore precisa estar dentro de <CollectionProvider>.");
  return ctx;
}

/**
 * Helper para a TabBar e outros consumidores que só precisam do total.
 */
export function useCollectionCount(): number {
  const { summary } = useCollectionStore();
  return summary.totalItems;
}

/**
 * Helper para acessar a quantidade de um carro específico (0 quando não
 * está na coleção).
 */
export function useCollectionQuantity(carId: string): number {
  const { items, version } = useCollectionStore();
  // `version` força re-render quando o mapa muda (mesmo que o valor
  // individual de carId não tenha mudado).
  void version;
  return items[carId] ?? 0;
}
