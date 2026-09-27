import { isNotFound, newsImageUrl } from "./_appwrite";
import { api } from "./_http";
import type { NewsItem } from "@/types";

/**
 * Notícias — backend próprio, rotas `/v2/news` (`docs/API-V2.md`
 * §Notícias). Rota pública: não exige `Authorization` (um JWT enviado
 * seria ignorado), por isso `auth: false` nas duas chamadas.
 *
 * A API só devolve notícias com `published = true`, mais recentes
 * primeiro. Paginação por cursor opaco: `{ items, total, nextCursor }`,
 * com `total` só na 1ª página — mesmo padrão de `catalog.ts`.
 */

type ApiNews = {
  id: string;
  title: string;
  summary: string;
  content: string;
  imageFileId: string | null;
  link: string | null;
  publishedAt: string;
};

type ApiPage<T> = { items: T[]; total: number | null; nextCursor: string | null };

function apiNewsToItem(n: ApiNews): NewsItem {
  return {
    id: n.id,
    title: n.title,
    summary: n.summary ?? "",
    content: n.content ?? "",
    imagem: newsImageUrl(n.imageFileId, "list"),
    imagemFull: newsImageUrl(n.imageFileId, "detail"),
    link: n.link,
    publishedAt: n.publishedAt,
  };
}

export interface PaginatedNews {
  items: NewsItem[];
  total: number | null;
  nextCursor: string | null;
}

/** Feed paginado, mais recentes primeiro. */
export async function listNewsPaged(
  options: { cursor?: string; pageSize?: number } = {}
): Promise<PaginatedNews> {
  const page = await api<ApiPage<ApiNews>>("/v2/news", {
    query: { cursor: options.cursor, limit: options.pageSize ?? 20 },
    auth: false,
  });
  return { items: page.items.map(apiNewsToItem), total: page.total, nextCursor: page.nextCursor };
}

/** As mais recentes, para a seção "Últimas notícias" da Home. */
export async function listLatestNews(limit = 3): Promise<NewsItem[]> {
  const page = await listNewsPaged({ pageSize: limit });
  return page.items;
}

/** Detalhe; `null` quando não existe ou não está publicada (mesma resposta, 404). */
export async function getNewsById(id: string): Promise<NewsItem | null> {
  try {
    return apiNewsToItem(await api<ApiNews>(`/v2/news/${encodeURIComponent(id)}`, { auth: false }));
  } catch (err) {
    if (isNotFound(err)) return null;
    throw err;
  }
}
