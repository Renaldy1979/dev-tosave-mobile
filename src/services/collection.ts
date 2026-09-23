import { carsMock, collectionMock } from "@/mocks";
import type {
  Car,
  CollectionItem,
  CollectionItemWithCar,
  CollectionSummary,
} from "@/types";
import { simulateLatency } from "./_delay";

/**
 * Coleção em memória. A fase 1 muta este array a cada `addToCollection`,
 * `removeFromCollection` e `setCollectionQuantity`. A fase 2 substitui
 * por chamadas HTTP — a forma do dado continua a mesma.
 */
const state: { items: CollectionItem[] } = {
  items: collectionMock.map((item) => ({ ...item })),
};

function nextId(): string {
  return `ci-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Critérios de listagem aceitos pela tela Coleção.
 * - `q` busca em `title`, `toy` e `collector` (case-insensitive).
 * - `duplicatesOnly` aplica o filtro "Repetidos" (`quantity > 1`).
 */
export interface CollectionListFilters {
  q?: string;
  duplicatesOnly?: boolean;
}

function matchesQuery(car: Car, term: string): boolean {
  const lower = term.toLowerCase();
  return (
    car.title.toLowerCase().includes(lower) ||
    car.toy.toLowerCase().includes(lower) ||
    car.collector.toLowerCase().includes(lower)
  );
}

/**
 * Lista os itens da coleção do usuário atual, já com o carro resolvido.
 * Quando o usuário não está autenticado, retorna lista vazia — a tela
 * Coleção mostra o `LoginGate` nesse caso.
 */
export async function getCollection(
  userId: string,
  filters: CollectionListFilters = {}
): Promise<CollectionItemWithCar[]> {
  await simulateLatency();
  const term = filters.q?.trim() ?? "";
  return state.items
    .filter((item) => item.userId === userId)
    .filter((item) => (filters.duplicatesOnly ? item.quantity > 1 : true))
    .map((item) => {
      const car = carsMock.find((c) => c.id === item.carId);
      if (!car) {
        // Carro órfão: descartar silenciosamente. Em produção vira 404.
        return null;
      }
      if (term && !matchesQuery(car, term)) return null;
      return { ...item, car };
    })
    .filter((value): value is CollectionItemWithCar => value !== null);
}

/**
 * Resumo usado por Coleção e Perfil:
 * - `totalItems` = soma das quantidades;
 * - `totalModels` = carros distintos;
 * - `duplicates` = modelos com `quantity > 1` (alimenta o filtro Repetidos).
 */
export async function getCollectionSummary(
  userId: string
): Promise<CollectionSummary> {
  await simulateLatency();
  const items = state.items.filter((item) => item.userId === userId);
  return {
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    totalModels: items.length,
    duplicates: items.filter((item) => item.quantity > 1).length,
  };
}

/**
 * Adiciona uma unidade do carro à coleção. Se já existir, soma 1.
 * Retorna o item final (com `quantity` atualizada) para a UI confirmar
 * sem precisar de um `getCollection` extra.
 */
export async function addToCollection(
  userId: string,
  carId: string
): Promise<CollectionItem> {
  await simulateLatency();
  const existing = state.items.find(
    (item) => item.userId === userId && item.carId === carId
  );
  if (existing) {
    if (existing.quantity < 99) {
      existing.quantity += 1;
    }
    return { ...existing };
  }
  const created: CollectionItem = {
    id: nextId(),
    userId,
    carId,
    quantity: 1,
    createdAt: nowIso(),
  };
  state.items.push(created);
  return { ...created };
}

/**
 * Remove o item inteiro da coleção (independente da quantidade).
 * Retorna `true` se removeu, `false` se não encontrou.
 */
export async function removeFromCollection(
  userId: string,
  carId: string
): Promise<boolean> {
  await simulateLatency();
  const before = state.items.length;
  state.items = state.items.filter(
    (item) => !(item.userId === userId && item.carId === carId)
  );
  return state.items.length < before;
}

/**
 * Define a quantidade exata (mín 1, máx 99). Quantidade 0 remove o item.
 * Usado pelo QuantityStepper do detalhe (após o +/−) e da Coleção.
 */
export async function setCollectionQuantity(
  userId: string,
  carId: string,
  quantity: number
): Promise<CollectionItem | null> {
  await simulateLatency();
  const clamped = Math.max(0, Math.min(99, Math.floor(quantity)));
  const existing = state.items.find(
    (item) => item.userId === userId && item.carId === carId
  );
  if (clamped === 0) {
    if (existing) {
      state.items = state.items.filter((item) => item !== existing);
    }
    return null;
  }
  if (existing) {
    existing.quantity = clamped;
    return { ...existing };
  }
  const created: CollectionItem = {
    id: nextId(),
    userId,
    carId,
    quantity: clamped,
    createdAt: nowIso(),
  };
  state.items.push(created);
  return { ...created };
}

/**
 * Quantidade atual de um carro na coleção. Usado pelo coração dos
 * cards (Home/Busca) e pela tela de detalhe (badge flame "Repetido"
 * + CollectionPanel).
 */
export async function getCollectionQuantity(
  userId: string,
  carId: string
): Promise<number> {
  await simulateLatency();
  return (
    state.items.find(
      (item) => item.userId === userId && item.carId === carId
    )?.quantity ?? 0
  );
}
