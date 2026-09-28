import { isNotFound } from "./_appwrite";
import { api } from "./_http";
import { apiCarToListItem, type ApiCar } from "./catalog";
import type { TradeListing, TradeStatus, TradeType } from "@/types";

/**
 * Clube da Troca — backend próprio, rotas `/v2/trade` (contrato
 * confirmado pelo Alicerce em 27/09/2026; `docs/API-V2.md` ainda vai
 * publicar a seção).
 *
 * Regras do servidor (não replicadas aqui): o carro ofertado precisa
 * estar na coleção (`quantity > 0`); a "vaga" só limita quantos
 * anúncios `ACTIVE` do mesmo carro cabem na quantidade que o usuário
 * tem, sem mexer na coleção; concluir/cancelar libera a vaga na hora.
 * O telefone do anunciante nunca vem no item — só em
 * `revealTradeContact`.
 */

type ApiTradeListing = {
  id: string;
  car: ApiCar;
  userId: string;
  userName: string;
  type: TradeType;
  price: number | null;
  description: string;
  status: TradeStatus;
  desiredCars: ApiCar[];
  hasContact: boolean;
  createdAt: string;
};

type ApiPage<T> = { items: T[]; total: number | null; nextCursor: string | null };

function apiToListing(t: ApiTradeListing): TradeListing {
  return {
    id: t.id,
    car: apiCarToListItem(t.car),
    userId: t.userId,
    userName: t.userName,
    type: t.type,
    price: t.price,
    description: t.description ?? "",
    status: t.status,
    desiredCars: (t.desiredCars ?? []).map(apiCarToListItem),
    hasContact: t.hasContact,
    createdAt: t.createdAt,
  };
}

export interface PaginatedTrade {
  items: TradeListing[];
  total: number | null;
  nextCursor: string | null;
}

/** Vitrine: só `ACTIVE`, mais recentes primeiro. */
export async function listTradePaged(
  options: { type?: TradeType; q?: string; cursor?: string; pageSize?: number } = {}
): Promise<PaginatedTrade> {
  const page = await api<ApiPage<ApiTradeListing>>("/v2/trade", {
    query: { type: options.type, q: options.q?.trim() || undefined, cursor: options.cursor, limit: options.pageSize ?? 20 },
  });
  return { items: page.items.map(apiToListing), total: page.total, nextCursor: page.nextCursor };
}

/** "Meus anúncios": todos os status do usuário logado (`status` filtra um só). */
export async function listMyTradePaged(
  options: { status?: TradeStatus; cursor?: string; pageSize?: number } = {}
): Promise<PaginatedTrade> {
  const page = await api<ApiPage<ApiTradeListing>>("/v2/trade/mine", {
    query: { status: options.status, cursor: options.cursor, limit: options.pageSize ?? 20 },
  });
  return { items: page.items.map(apiToListing), total: page.total, nextCursor: page.nextCursor };
}

/** Detalhe, qualquer status (o dono precisa ver o próprio concluído/cancelado); `null` se não existe. */
export async function getTradeById(id: string): Promise<TradeListing | null> {
  try {
    return apiToListing(await api<ApiTradeListing>(`/v2/trade/${encodeURIComponent(id)}`));
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}

export interface CreateTradeInput {
  carId: string;
  type: TradeType;
  price?: number;
  desiredCarIds?: string[];
  description?: string;
}

export type CreateTradeResult = { ok: true; listing: TradeListing } | { ok: false; message: string };

/** Cria o anúncio; `userId` sempre do JWT. Erros de validação vêm com a mensagem do servidor. */
export async function createTradeListing(input: CreateTradeInput): Promise<CreateTradeResult> {
  try {
    const listing = await api<ApiTradeListing>("/v2/trade", {
      method: "POST",
      body: {
        carId: input.carId,
        type: input.type,
        price: input.type === "SALE" ? input.price : undefined,
        desiredCarIds: input.type === "TRADE" ? input.desiredCarIds : undefined,
        description: input.description?.trim() || undefined,
      },
    });
    return { ok: true, listing: apiToListing(listing) };
  } catch (err) {
    const message = err instanceof Error && err.message ? err.message : "Não foi possível publicar o anúncio.";
    return { ok: false, message };
  }
}

/** Dono: marca `COMPLETED`. */
export async function completeTradeListing(id: string): Promise<TradeListing> {
  return apiToListing(
    await api<ApiTradeListing>(`/v2/trade/${encodeURIComponent(id)}/complete`, { method: "PUT" })
  );
}

/** Dono: cancela sem concluir (`CANCELLED`). */
export async function cancelTradeListing(id: string): Promise<void> {
  await api(`/v2/trade/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/**
 * "Revelar contato": dono recebe o próprio telefone sem notificar;
 * quem não é dono recebe o telefone e o servidor notifica o dono
 * (`trade_interest`). `null` = anunciante sem telefone cadastrado.
 */
export async function revealTradeContact(id: string): Promise<string | null> {
  const res = await api<{ phone: string | null }>(`/v2/trade/${encodeURIComponent(id)}/contact`, {
    method: "POST",
  });
  return res.phone;
}
