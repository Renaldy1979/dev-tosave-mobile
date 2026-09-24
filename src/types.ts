/**
 * Tipos de domínio do app ToSave.
 *
 * Espelham o schema do portal web (docs/ESPECIFICACAO-MOBILE.md).
 * Na fase 1 os mocks produzem valores com este formato; na fase 2 a
 * implementação de `src/services/` troca para chamadas HTTP sem mexer
 * nas telas nem nestes tipos.
 *
 * Convenções:
 * - Campos opcionais terminam em `?` (a tela esconde a linha quando
 *   ausentes, em vez de mostrar "—").
 * - `collector` é string para preservar zeros à esquerda ("001").
 * - `seriePosition` e `scale` são strings ("8/10", "1/64") para
 *   manter formatação original.
 * - Datas são strings ISO 8601 em UTC.
 */

// ---------- Marcas ----------

/**
 * Situação da marca no catálogo.
 * - "ativa": linha atual, exibida normalmente.
 * - "descontinuada": coleção histórica, exibida com badge "Descontinuada".
 * - "em_analise": uso interno; a especificação diz que não é exibida ao
 *   colecionador (mantemos o literal para casar com o portal).
 */
export type BrandState = "ativa" | "descontinuada" | "em_analise";

export interface Brand {
  id: string;
  name: string;
  state: BrandState;
  image: string;
  active: boolean;
  createdAt: string;
}

// ---------- Séries ----------

export interface Serie {
  id: string;
  title: string;
  description: string;
  imagem: string;
  /**
   * Séries marcadas como destaque aparecem no carrossel da Home.
   * Várias séries podem ser destaque ao mesmo tempo (não é exclusivo).
   */
  isDefault: boolean;
  createdAt: string;
}

// ---------- Atributos ----------

export interface Attribute {
  id: string;
  title: string;
  description: string;
}

// ---------- Carros ----------

export interface Car {
  id: string;
  title: string;
  description: string;
  brandId: string;
  serieId: string;
  /**
   * Número do colecionador. String para preservar zeros à esquerda
   * (ex.: "001", "042"). A UI exibe como "#001".
   */
  collector: string;
  /** Nome da cor para exibição (ex.: "Azul"). Hex fica em ColorBadge. */
  color: string;
  /** Imagem principal em alta resolução. Pode ser null (palco vazio). */
  imagemFull: string | null;
  /** Thumbnail usado nos grids (CarCard). Pode ser null. */
  imagemThumb: string | null;
  /**
   * Posição na série (ex.: "8/10"). String para preservar formatação.
   * Opcional — alguns carros não têm posição definida.
   */
  seriePosition: string | null;
  /** Código de busca do brinquedo (ex.: "HKJ42"). Único no portal. */
  toy: string;
  year: number;
  /** Escala do modelo (ex.: "1/64"). String para preservar formatação. */
  scale: string;
  /** Ids dos atributos (ex.: T-Hunt). Opcional: nem toda leitura traz. */
  attributeIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CarImage {
  id: string;
  carId: string;
  /** URL ou caminho da imagem adicional da galeria. */
  path: string;
  /** Ordem de exibição na galeria (crescente; `imagemFull` é sempre 0). */
  position: number;
}

// ---------- Coleção do usuário ----------

export interface CollectionItem {
  id: string;
  userId: string;
  carId: string;
  /** Quantidade que o colecionador possui. Padrão 1, máximo 99. */
  quantity: number;
  createdAt: string;
}

// ---------- Usuários ----------

export type UserRole = "ADMIN" | "COLLECTOR";
export type UserStatus = "active" | "inactive" | "blocked";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  /** Token de push do Expo Notifications (opcional). */
  expo_push_token: string | null;
}

// ---------- Filtros de busca ----------

/**
 * Filtros aceitos por `listCars`. Todos os campos são opcionais;
 * combinações vazias retornam o catálogo completo.
 *
 * - `q`: termo livre que casa com `title`, `toy` e `collector`.
 * - `years`: lista de anos (OR entre si; a UI usa multi-seleção).
 * - `attributeIds`: lista de atributos (AND entre si — o carro precisa
 *   ter todos os atributos marcados).
 */
export interface CarFilters {
  q?: string;
  years?: number[];
  serieId?: string;
  brandId?: string;
  attributeIds?: string[];
}

// ---------- Vistas compostas ----------

/**
 * Car + relações usadas pela tela de detalhe. O service monta esse
 * objeto juntando `cars.get` com `brands`/`series`/`attributes`/`images`.
 */
export interface CarDetail extends Car {
  brand: Brand;
  serie: Serie;
  attributes: Attribute[];
  images: CarImage[];
}

/**
 * Car com nome da marca e da série já resolvidos. É o tipo que o
 * `CarCard` consome (não precisa importar `brands`/`series` para
 * renderizar). Produzido por `listCarsPaged` e `listBySerie`.
 */
export interface CarListItem extends Car {
  brandName: string;
  serieTitle: string;
}

/**
 * Item da coleção com o carro já resolvido. Usado pela tela Coleção e
 * pelo `getCollection` — evita que cada card faça seu próprio `getCar`.
 */
export interface CollectionItemWithCar extends CollectionItem {
  car: Car;
}

export interface CollectionSummary {
  /** Soma de `quantity` de todos os itens. */
  totalItems: number;
  /** Quantidade de modelos distintos (1 por CollectionItem). */
  totalModels: number;
  /** Quantos modelos têm `quantity > 1` (alimenta o filtro Repetidos). */
  duplicates: number;
}

// ---------- Sessão de auth ----------

/**
 * Estado da sessão atual. `user` é `null` quando não há login.
 * Mantido em memória pelos services de auth; a fase 2 persiste.
 */
export interface Session {
  user: User | null;
}
