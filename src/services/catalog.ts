import {
  attributesMock,
  brandsMock,
  carImagesMock,
  carsMock,
  seriesMock,
} from "@/mocks";
import type {
  Attribute,
  Brand,
  Car,
  CarDetail,
  CarFilters,
  CarListItem,
  Serie,
} from "@/types";
import { simulateLatency } from "./_delay";

/**
 * Normaliza uma string para busca textual: minúsculas e sem acentos.
 * Usado para casar `q` com `title`, `toy` e `collector` ignorando
 * variações de caixa e acentuação.
 */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Aplica os filtros de `CarFilters` a uma lista de carros. Extraído
 * para reuso entre `listCars`, `countCars` e `listBySerie`.
 */
function applyFilters(cars: Car[], filters: CarFilters): Car[] {
  const rawQuery = filters.q?.trim();
  const term = rawQuery ? normalize(rawQuery.replace(/^#/, "")) : null;

  return cars.filter((car) => {
    if (term && rawQuery) {
      // Prioridade para o termo ser o `toy` exato (>= 4 chars, alfanumérico)
      // — espelha o comportamento descrito em `04-busca-filtros.md §3`.
      const alfanum = rawQuery.replace(/^#/, "");
      const isExactToy =
        alfanum.length >= 4 &&
        /^[a-z0-9]+$/i.test(alfanum) &&
        car.toy.toLowerCase() === alfanum.toLowerCase();
      const collectorMatch = normalize(car.collector) === term;
      const titleMatch = normalize(car.title).includes(term);
      if (!isExactToy && !collectorMatch && !titleMatch) {
        return false;
      }
    }

    if (filters.serieId && car.serieId !== filters.serieId) {
      return false;
    }
    if (filters.brandId && car.brandId !== filters.brandId) {
      return false;
    }
    if (filters.years && filters.years.length > 0 && !filters.years.includes(car.year)) {
      return false;
    }
    if (filters.attributeIds && filters.attributeIds.length > 0) {
      // AND entre atributos: o carro precisa ter todos os atributos
      // marcados. Os atributos por carro estão em `carAttributesMock`.
      const carAttrIds = new Set(
        carAttributesByCarId[car.id]?.map((a) => a.id) ?? []
      );
      for (const attrId of filters.attributeIds) {
        if (!carAttrIds.has(attrId)) {
          return false;
        }
      }
    }
    return true;
  });
}

/**
 * Associação carro → atributos. Mantida em escopo de módulo para que
 * `applyFilters` não precise varrer `carAttributesMock` por linha.
 */
import { carAttributesMock } from "@/mocks/carAttributes";

const carAttributesByCarId: Record<string, { id: string }[]> =
  carAttributesMock.reduce<Record<string, { id: string }[]>>((acc, link) => {
    (acc[link.carId] ??= []).push({ id: link.attributeId });
    return acc;
  }, {});

/**
 * Lista de carros com filtros opcionais. `q` busca por `title`, `toy`
 * e `collector`; demais filtros casam exato.
 */
export async function listCars(filters: CarFilters = {}): Promise<Car[]> {
  await simulateLatency();
  const filtered = applyFilters(carsMock, filters);
  // Ordena por ano desc e depois título asc — base estável para a grid.
  return [...filtered].sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return a.title.localeCompare(b.title);
  });
}

/**
 * Resposta paginada para grids (Home, Busca, Coleção).
 * - `items`: `CarListItem` (já com `brandName` e `serieTitle`).
 * - `total`: total de itens que casam o filtro (para contagem).
 * - `page`: número da página devolvida (1-based).
 *
 * `pageSize` padrão = 20 (alinhado com a spec da Home).
 */
export interface PaginatedCars {
  items: CarListItem[];
  total: number;
  page: number;
}

export interface ListCarsPagedOptions extends CarFilters {
  page?: number;
  pageSize?: number;
}

function toListItem(car: Car): CarListItem {
  return {
    ...car,
    brandName: brandsMock.find((b) => b.id === car.brandId)?.name ?? "",
    serieTitle: seriesMock.find((s) => s.id === car.serieId)?.title ?? "",
  };
}

export async function listCarsPaged(
  options: ListCarsPagedOptions = {}
): Promise<PaginatedCars> {
  await simulateLatency();
  const { page = 1, pageSize = 20, ...filters } = options;
  const filtered = applyFilters(carsMock, filters).sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return a.title.localeCompare(b.title);
  });
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize).map(toListItem);
  return { items, total: filtered.length, page };
}

/**
 * Versão paginada de `listBySerie` que devolve `CarListItem`. Usada
 * pela faixa "Mais da série" no detalhe.
 */
export async function listBySeriePaged(
  serieId: string,
  options: { excludeId?: string; page?: number; pageSize?: number } = {}
): Promise<PaginatedCars> {
  await simulateLatency();
  const { excludeId, page = 1, pageSize = 10 } = options;
  const filtered = carsMock
    .filter((car) => car.serieId === serieId && car.id !== excludeId)
    .sort((a, b) => {
      if (a.seriePosition && b.seriePosition) {
        return a.seriePosition.localeCompare(b.seriePosition);
      }
      return a.title.localeCompare(b.title);
    });
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize).map(toListItem);
  return { items, total: filtered.length, page };
}

/**
 * Contagem de carros para o filtro aplicado. A UI usa para mostrar
 * "312 miniaturas" e alimentar o botão "Ver N resultados" do sheet.
 */
export async function countCars(filters: CarFilters = {}): Promise<number> {
  await simulateLatency();
  return applyFilters(carsMock, filters).length;
}

/**
 * Lista os anos disponíveis no catálogo, em ordem decrescente.
 * Alimenta o filtro "Ano" do FilterSheet (multi-seleção, OR).
 */
export async function listYears(): Promise<number[]> {
  await simulateLatency();
  const years = new Set(carsMock.map((car) => car.year));
  return [...years].sort((a, b) => b - a);
}

export async function getCarById(id: string): Promise<CarDetail | null> {
  await simulateLatency();
  const car = carsMock.find((c) => c.id === id);
  if (!car) return null;

  const brand = brandsMock.find((b) => b.id === car.brandId);
  const serie = seriesMock.find((s) => s.id === car.serieId);
  if (!brand || !serie) return null;

  const attributes = carAttributesMock
    .filter((link) => link.carId === car.id)
    .map((link) => attributesMock.find((a) => a.id === link.attributeId))
    .filter((a): a is Attribute => Boolean(a));

  const images = carImagesMock
    .filter((img) => img.carId === car.id)
    .sort((a, b) => a.position - b.position);

  return {
    ...car,
    brand,
    serie,
    attributes,
    images,
  };
}

/**
 * Outros carros da mesma série, para a faixa "Mais da série" no detalhe.
 * `excludeId` remove o carro atual; `limit` define o tamanho da faixa.
 */
export async function listBySerie(
  serieId: string,
  options: { excludeId?: string; limit?: number } = {}
): Promise<Car[]> {
  await simulateLatency();
  const { excludeId, limit = 10 } = options;
  return carsMock
    .filter((car) => car.serieId === serieId && car.id !== excludeId)
    .sort((a, b) => {
      // Posição na série quando disponível; cai para título asc.
      if (a.seriePosition && b.seriePosition) {
        return a.seriePosition.localeCompare(b.seriePosition);
      }
      return a.title.localeCompare(b.title);
    })
    .slice(0, limit);
}

// ---------- Séries ----------

/**
 * Lista séries. Com `featured: true`, devolve só as marcadas como
 * destaque (`isDefault`). É a forma unificada pedida pelo
 * `README.md` ("contrato de dados das telas").
 */
export async function listSeries(options: { featured?: boolean } = {}): Promise<Serie[]> {
  await simulateLatency();
  if (options.featured) return seriesMock.filter((serie) => serie.isDefault);
  return [...seriesMock];
}

/** Mantida por compatibilidade com chamadas existentes. */
export async function listFeaturedSeries(): Promise<Serie[]> {
  await simulateLatency();
  return seriesMock.filter((serie) => serie.isDefault);
}

// ---------- Marcas ----------

export async function listBrands(): Promise<Brand[]> {
  await simulateLatency();
  return [...brandsMock];
}

// ---------- Atributos ----------

export async function listAttributes(): Promise<Attribute[]> {
  await simulateLatency();
  return [...attributesMock];
}

// ---------- Auxiliar para a Home ----------

/**
 * Quantos carros pertencem a cada série — usado pelo SeriesCard para
 * mostrar "12 miniaturas" sob o título. Mantido no service porque
 * o dado é derivado do join carros × séries.
 */
export async function getSeriesCarCount(): Promise<Record<string, number>> {
  await simulateLatency();
  return carsMock.reduce<Record<string, number>>((acc, car) => {
    acc[car.serieId] = (acc[car.serieId] ?? 0) + 1;
    return acc;
  }, {});
}
