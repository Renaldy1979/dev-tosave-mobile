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
  getCollectionPaged,
  getCollectionSummary,
  removeFromCollection,
  setCollectionQuantity,
} from "@/services/collection";
import { useCurrentUser } from "./useCurrentUser";
import type { Car, CollectionItemWithCar, CollectionSummary } from "@/types";

/**
 * Store compartilhado da coleção (`docs/ESPECIFICACAO-MOBILE.md` — store
 * leve com mapa `carId → quantity`). O coração dos cards (Home, Busca,
 * Detalhe), o painel da Coleção e o badge da TabBar leem daqui, então
 * a contagem e o estado de cada item ficam coerentes sem precisar de
 * fetch em cada tela.
 *
 * Carregamento: reage ao `user` do `useCurrentUser` (store de módulo).
 * Quando o usuário entra, recarrega a coleção do novo user; quando sai,
 * limpa o mapa e o summary.
 *
 * Ações otimistas (`add`, `remove`, `setQuantity`, `toggle`) atualizam o
 * store e revalidam com o service. Quando chamadas sem user (visitante),
 * disparam erro explícito em vez de sair em silêncio — a fase 2
 * trava o app atrás do login, então ações sem user só acontecem em
 * bug.
 */
type CollectionState = {
  /** Mapa `carId → quantity` (0 quando não está na coleção). */
  items: Record<string, number>;
  /** Mapa `carId → Car` resolvido a partir do `getCollection`. Usado pela
   *  tela Coleção (e outros) para renderizar cards sem `getCollection`
   *  próprio. */
  carsById: Record<string, Car>;
  /** Total de unidades e modelos para o badge e o resumo. */
  summary: CollectionSummary;
  /** Versão do store (incrementa a cada mutação), para forçar re-render. */
  version: number;
  /** Usado pela UI: nada a exibir enquanto carrega a primeira vez. */
  loaded: boolean;
  /** A última carga falhou (o store mantém o que já tinha). A Coleção
   *  mostra `ErrorState` quando não há nada carregado. */
  error: boolean;
};

type CollectionActions = {
  toggle: (carId: string) => Promise<void>;
  setQuantity: (carId: string, quantity: number) => Promise<void>;
  remove: (carId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

type CollectionContextValue = CollectionState & CollectionActions;

const emptySummary: CollectionSummary = { totalItems: 0, totalModels: 0, duplicates: 0 };

const CollectionContext = createContext<CollectionContextValue | null>(null);

export type CollectionProviderProps = {
  children: ReactNode;
};

export function CollectionProvider({ children }: CollectionProviderProps) {
  const { user } = useCurrentUser();
  const [items, setItems] = useState<Record<string, number>>({});
  const [carsById, setCarsById] = useState<Record<string, Car>>({});
  const [summary, setSummary] = useState<CollectionSummary>(emptySummary);
  const [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

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
      setCarsById({});
      setSummary(emptySummary);
      setError(false);
      setLoaded(true);
      return;
    }
    try {
      // Carrega a 1ª página (até 1000 itens cabe a maioria dos
      // colecionadores; a paginação por cursor fica para uma 2ª
      // rodada — registrada no briefing).
      const [paged, sum] = await Promise.all([
        getCollectionPaged({ pageSize: 1000 }),
        getCollectionSummary(),
      ]);
      const map: Record<string, number> = {};
      const cars: Record<string, Car> = {};
      paged.items.forEach((it: CollectionItemWithCar) => {
        map[it.carId] = it.quantity;
        cars[it.carId] = it.car;
      });
      setItems(map);
      setCarsById(cars);
      setSummary(sum);
      setError(false);
      setLoaded(true);
    } catch (err) {
      // Mantém o estado anterior, marca o erro e repassa: quem chamou
      // decide o feedback (Toast no pull-to-refresh, ErrorState na
      // Coleção vazia).
      setError(true);
      setLoaded(true);
      throw err;
    }
  }, [user]);

  // Reage ao user: entra → carrega a coleção; sai → limpa.
  useEffect(() => {
    setLoaded(false);
    // O erro fica em `error`; aqui não há quem mostre Toast.
    refresh().catch(() => undefined);
  }, [refresh, user?.id]);

  const toggle = useCallback(
    async (carId: string) => {
      // App travado (fase 2): sem user nunca chegamos aqui.
      if (!user) {
        throw new Error("collection_toggle_failed");
      }
      const previous = items[carId] ?? 0;
      const next = previous > 0 ? 0 : 1;
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
          await removeFromCollection(carId);
        } else {
          await addToCollection(carId);
        }
      } catch {
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
      // App travado (fase 2): sem user nunca chegamos aqui.
      if (!user) {
        throw new Error("collection_set_failed");
      }
      const previous = items[carId] ?? 0;
      setItems((cur) => {
        const updated = { ...cur };
        if (quantity <= 0) delete updated[carId];
        else updated[carId] = quantity;
        setSummary(recomputeSummary(updated));
        return updated;
      });
      setVersion((v) => v + 1);
      try {
        await setCollectionQuantity(carId, quantity);
      } catch {
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
      // App travado (fase 2): sem user nunca chegamos aqui.
      if (!user) {
        throw new Error("collection_remove_failed");
      }
      const previous = items[carId] ?? 0;
      setItems((cur) => {
        const updated = { ...cur };
        delete updated[carId];
        setSummary(recomputeSummary(updated));
        return updated;
      });
      setVersion((v) => v + 1);
      try {
        await removeFromCollection(carId);
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

  const value = useMemo<CollectionContextValue>(
    () => ({
      items,
      carsById,
      summary,
      version,
      loaded,
      error,
      toggle,
      setQuantity: setQuantityAction,
      remove: removeAction,
      refresh,
    }),
    [
      items,
      carsById,
      summary,
      version,
      loaded,
      error,
      toggle,
      setQuantityAction,
      removeAction,
      refresh,
    ]
  );

  return <CollectionContext.Provider value={value}>{children}</CollectionContext.Provider>;
}

export function useCollectionStore() {
  const ctx = useContext(CollectionContext);
  if (!ctx) throw new Error("useCollectionStore precisa estar dentro de <CollectionProvider>.");
  return ctx;
}

/**
 * Helper para acessar a quantidade de um carro específico (0 quando não
 * está na coleção).
 */
export function useCollectionQuantity(carId: string): number {
  const { items, version } = useCollectionStore();
  void version;
  return items[carId] ?? 0;
}
