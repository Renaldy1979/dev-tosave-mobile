import { api } from "./_http";
import { apiCarToListItem, type ApiCar } from "./catalog";
import type { CollectionItem, CollectionItemWithCar, CollectionSummary } from "@/types";

/**
 * Coleção do usuário — backend próprio, rotas `/v2/collection`.
 *
 * O usuário vem do JWT (nunca dos argumentos). A posse de cada carro vem
 * no próprio item (`quantity`), em todas as listas: o app não guarda a
 * coleção. As mutações são UPSERT/DELETE atômicos no Postgres e devolvem
 * o item e o resumo.
 */

type ApiCollectionItem = CollectionItem & { car: ApiCar };

/** Ordenação da Coleção, aplicada no servidor. */
export type CollectionSort = "recent" | "name" | "year" | "quantity";

/** Critérios da tela Coleção. */
export interface CollectionListFilters {
  q?: string;
  duplicatesOnly?: boolean;
  sort?: CollectionSort;
}

/** Resposta paginada por cursor. */
export interface PaginatedCollection {
  items: CollectionItemWithCar[];
  /** Total só na 1ª página; null nas demais. */
  total: number | null;
  /** Cursor da próxima página; null quando acabou. */
  nextCursor: string | null;
}

/** Coleção paginada por cursor, com busca, "Repetidos" e ordenação no servidor. */
export async function getCollectionPaged(
  filters: CollectionListFilters & { cursor?: string; pageSize?: number } = {}
): Promise<PaginatedCollection> {
  const page = await api<{ items: ApiCollectionItem[]; total: number | null; nextCursor: string | null }>(
    "/v2/collection",
    {
      query: {
        q: filters.q?.trim() || undefined,
        duplicatesOnly: filters.duplicatesOnly ? true : undefined,
        // O cursor só vale para a ordenação em que foi gerado.
        sort: filters.sort ?? "recent",
        cursor: filters.cursor,
        limit: filters.pageSize ?? 20,
      },
    }
  );
  return {
    items: page.items.map((it) => ({
      id: it.id,
      userId: it.userId,
      carId: it.carId,
      quantity: it.quantity,
      createdAt: it.createdAt,
      car: { ...apiCarToListItem(it.car), quantity: it.quantity },
    })),
    total: page.total,
    nextCursor: page.nextCursor,
  };
}

/** Resumo: `totalItems`, `totalModels`, `duplicates`. */
export async function getCollectionSummary(): Promise<CollectionSummary> {
  return api<CollectionSummary>("/v2/collection/summary");
}

/** Resposta das mutações: o item (null se saiu) e o resumo atualizado. */
export type CollectionMutationResult = { item: CollectionItem | null; summary: CollectionSummary };

/** +1 unidade (teto de 99). */
export async function addToCollection(carId: string): Promise<CollectionMutationResult> {
  return api<CollectionMutationResult>(`/v2/collection/${encodeURIComponent(carId)}/add`, { method: "POST" });
}

/** Define a quantidade (0 a 99; 0 remove). */
export async function setCollectionQuantity(carId: string, quantity: number): Promise<CollectionMutationResult> {
  return api<CollectionMutationResult>(`/v2/collection/${encodeURIComponent(carId)}`, {
    method: "PUT",
    body: { quantity: Math.max(0, Math.min(99, Math.floor(quantity))) },
  });
}

/** Remove o carro da coleção. */
export async function removeFromCollection(carId: string): Promise<CollectionMutationResult> {
  return api<CollectionMutationResult>(`/v2/collection/${encodeURIComponent(carId)}`, { method: "DELETE" });
}
