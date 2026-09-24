/**
 * Schema do ToSave como código (docs/ESPECIFICACAO-BACKEND.md §3 e §4).
 * Aplicado por scripts/schema.mjs, que só cria o que falta ou atualiza
 * permissões — nunca apaga coluna, índice ou tabela.
 */
import { Permission, Role } from "node-appwrite";
import { ADMINS_TEAM_ID } from "./appwrite.mjs";

const catalogPermissions = [
  Permission.read(Role.users()),
  Permission.create(Role.team(ADMINS_TEAM_ID)),
  Permission.update(Role.team(ADMINS_TEAM_ID)),
  Permission.delete(Role.team(ADMINS_TEAM_ID)),
];

// Coleção e estatísticas: nenhuma permissão na tabela. Cada linha recebe
// read("user:<id>") e só a Function `collection` (API key) escreve.
const ownerOnlyPermissions = [];

const str = (key, size, opts = {}) => ({ kind: "string", key, size, required: false, ...opts });
const int = (key, opts = {}) => ({ kind: "integer", key, required: false, ...opts });
const bool = (key, opts = {}) => ({ kind: "boolean", key, required: false, ...opts });
const dt = (key, opts = {}) => ({ kind: "datetime", key, required: false, ...opts });
const enm = (key, elements, opts = {}) => ({ kind: "enum", key, elements, required: false, ...opts });

export const TABLES = [
  {
    id: "brands",
    name: "Brands",
    permissions: catalogPermissions,
    rowSecurity: false,
    columns: [
      str("name", 60, { required: true }),
      enm("state", ["ativa", "descontinuada", "em_analise"], { xdefault: "ativa" }),
      str("imageFileId", 36),
      bool("active", { xdefault: true }),
      int("carCount", { min: 0, xdefault: 0 }),
    ],
    indexes: [{ key: "idx_state", type: "key", columns: ["state"] }],
  },
  {
    id: "series",
    name: "Series",
    permissions: catalogPermissions,
    rowSecurity: false,
    columns: [
      str("title", 120, { required: true }),
      str("description", 2000, { xdefault: "" }),
      str("imageFileId", 36),
      bool("isDefault", { xdefault: false }),
      int("carCount", { min: 0, xdefault: 0 }),
    ],
    indexes: [
      { key: "idx_default_title", type: "key", columns: ["isDefault", "title"] },
      { key: "idx_title", type: "key", columns: ["title"] },
      // Busca por título na tela Séries (Query.search).
      { key: "ft_title", type: "fulltext", columns: ["title"] },
    ],
  },
  {
    id: "attributes",
    name: "Attributes",
    permissions: catalogPermissions,
    rowSecurity: false,
    columns: [str("title", 60, { required: true }), str("description", 2000, { xdefault: "" })],
    indexes: [{ key: "idx_title", type: "key", columns: ["title"] }],
  },
  {
    id: "cars",
    name: "Cars",
    permissions: catalogPermissions,
    rowSecurity: false,
    columns: [
      str("title", 120, { required: true }),
      str("description", 2000, { xdefault: "" }),
      str("brandId", 36, { required: true }),
      str("brandName", 60, { xdefault: "" }),
      str("serieId", 36, { required: true }),
      str("serieTitle", 120, { xdefault: "" }),
      str("seriePosition", 16),
      int("seriePositionNum", { min: 0 }),
      str("collector", 10, { xdefault: "" }),
      str("color", 120, { xdefault: "" }),
      str("toy", 20, { xdefault: "" }),
      int("year", { required: true, min: 1900, max: 2100 }),
      str("scale", 10, { xdefault: "" }),
      str("imageFileId", 36),
      str("attributeIds", 36, { array: true }),
      str("searchText", 400, { xdefault: "" }),
      // Chave para casar as fotos locais (/tosave/cars/<arquivo>.jpg).
      str("sourceImagePath", 255),
      dt("sourceCreatedAt"),
      dt("sourceUpdatedAt"),
    ],
    indexes: [
      { key: "ft_search", type: "fulltext", columns: ["searchText"] },
      { key: "idx_year_title", type: "key", columns: ["year", "title"], orders: ["desc", "asc"] },
      { key: "idx_serie_pos", type: "key", columns: ["serieId", "seriePositionNum", "title"] },
      { key: "idx_brand_year", type: "key", columns: ["brandId", "year"], orders: ["asc", "desc"] },
      { key: "idx_toy", type: "key", columns: ["toy"] },
      { key: "idx_collector", type: "key", columns: ["collector"] },
      { key: "idx_source_image", type: "key", columns: ["sourceImagePath"] },
    ],
  },
  {
    id: "car_images",
    name: "Car images",
    permissions: catalogPermissions,
    rowSecurity: false,
    columns: [
      str("carId", 36, { required: true }),
      str("fileId", 36, { required: true }),
      int("position", { required: true, min: 1 }),
    ],
    indexes: [{ key: "idx_car_pos", type: "key", columns: ["carId", "position"] }],
  },
  {
    id: "catalog_meta",
    name: "Catalog meta",
    permissions: catalogPermissions,
    rowSecurity: false,
    columns: [int("totalCars", { min: 0, xdefault: 0 }), int("years", { array: true })],
    indexes: [],
  },
  {
    id: "collection_items",
    name: "Collection items",
    permissions: ownerOnlyPermissions,
    rowSecurity: true,
    columns: [
      str("userId", 36, { required: true }),
      str("carId", 36, { required: true }),
      int("quantity", { required: true, min: 1, max: 99 }),
      // Campos do carro desnormalizados: a Coleção lista e busca sem join.
      str("carTitle", 120, { required: true }),
      str("carToy", 20, { xdefault: "" }),
      str("carCollector", 10, { xdefault: "" }),
      int("carYear"),
      str("carColor", 120, { xdefault: "" }),
      str("carScale", 10, { xdefault: "" }),
      str("carSeriePosition", 16),
      str("carImageFileId", 36),
      str("brandId", 36),
      str("brandName", 60, { xdefault: "" }),
      str("serieId", 36),
      str("serieTitle", 120, { xdefault: "" }),
      str("searchText", 400, { xdefault: "" }),
      dt("sourceCreatedAt"),
      // Atributos do carro (ícones T-Hunt/Super T-Hunt no card da Coleção).
      str("carAttributeIds", 36, { array: true }),
    ],
    indexes: [
      { key: "uq_user_car", type: "unique", columns: ["userId", "carId"] },
      { key: "idx_user_created", type: "key", columns: ["userId", "$createdAt"], orders: ["asc", "desc"] },
      { key: "idx_user_qty", type: "key", columns: ["userId", "quantity"] },
      { key: "idx_user_title", type: "key", columns: ["userId", "carTitle"] },
      { key: "idx_car", type: "key", columns: ["carId"] },
      { key: "ft_search", type: "fulltext", columns: ["searchText"] },
      // Progresso por série (serie-progress) e reparo das estatísticas.
      { key: "idx_user_serie", type: "key", columns: ["userId", "serieId"] },
      { key: "idx_user_year", type: "key", columns: ["userId", "carYear"] },
    ],
  },
  {
    id: "user_stats",
    name: "User stats",
    permissions: ownerOnlyPermissions,
    rowSecurity: true,
    columns: [
      int("totalItems", { min: 0, xdefault: 0 }),
      int("totalModels", { min: 0, xdefault: 0 }),
      int("duplicates", { min: 0, xdefault: 0 }),
    ],
    indexes: [],
  },
  {
    // Modelos possuídos por série (1 por modelo, sem contar quantity).
    // $id = "us_" + sha256(userId:serieId)[0:32]; só a Function collection escreve.
    id: "user_series_stats",
    name: "User series stats",
    permissions: ownerOnlyPermissions,
    rowSecurity: true,
    columns: [
      str("userId", 36, { required: true }),
      str("serieId", 36, { required: true }),
      int("owned", { min: 0, xdefault: 0 }),
      // Desnormalizados para ordenar/paginar por progresso no servidor.
      // pct = min(1000, round(owned / serieCarCount * 1000)) — em milésimos.
      int("serieCarCount", { min: 0, xdefault: 0 }),
      int("pct", { min: 0, max: 1000, xdefault: 0 }),
      // Ordenação "Nome" e desempate de "Maior %" na tela Estatísticas.
      str("serieTitle", 120, { xdefault: "" }),
    ],
    indexes: [
      { key: "uq_user_serie", type: "unique", columns: ["userId", "serieId"] },
      { key: "idx_user_owned", type: "key", columns: ["userId", "owned"], orders: ["asc", "desc"] },
      { key: "idx_user_pct", type: "key", columns: ["userId", "pct", "owned"], orders: ["asc", "desc", "desc"] },
      // catalog-sync: atualizar o progresso de todos quando o carCount da série muda.
      { key: "idx_serie", type: "key", columns: ["serieId"] },
      { key: "idx_user_title", type: "key", columns: ["userId", "serieTitle"] },
    ],
  },
  {
    // Modelos possuídos por ano. $id = "uy_" + sha256(userId:year)[0:32].
    id: "user_year_stats",
    name: "User year stats",
    permissions: ownerOnlyPermissions,
    rowSecurity: true,
    columns: [
      str("userId", 36, { required: true }),
      int("year", { required: true, min: 1900, max: 2100 }),
      int("owned", { min: 0, xdefault: 0 }),
    ],
    indexes: [
      { key: "uq_user_year", type: "unique", columns: ["userId", "year"] },
    ],
  },
  {
    // Configuração remota do app. Leitura PÚBLICA (links do Cadastro aparecem
    // antes do login); escrita só do time admins (futuro portal) e do servidor.
    // Uma linha só: $id = "public". Valores iniciais vazios.
    id: "app_config",
    name: "App config",
    permissions: [
      Permission.read(Role.any()),
      Permission.create(Role.team(ADMINS_TEAM_ID)),
      Permission.update(Role.team(ADMINS_TEAM_ID)),
      Permission.delete(Role.team(ADMINS_TEAM_ID)),
    ],
    rowSecurity: false,
    columns: [
      str("termsUrl", 500, { xdefault: "" }),
      str("privacyUrl", 500, { xdefault: "" }),
      str("supportEmail", 254, { xdefault: "" }),
      str("passwordRecoveryUrl", 500, { xdefault: "" }),
      // Versão mínima do app (semver "1.2.0"); vazio = sem bloqueio.
      str("minAppVersion", 20, { xdefault: "" }),
    ],
    indexes: [],
  },
  {
    // Tentativas por usuário para ações sensíveis (ex.: excluir conta).
    // $id = "<ação>_" + sha256(userId)[0:32]. Só o servidor lê e escreve.
    id: "rate_limits",
    name: "Rate limits",
    permissions: [],
    rowSecurity: true,
    columns: [
      int("attempts", { min: 0, xdefault: 0 }),
      dt("windowStart"),
    ],
    indexes: [],
  },
  {
    // Total de carros do catálogo por ano. $id = "y<ano>"; mantida pela catalog-sync.
    id: "year_counts",
    name: "Year counts",
    permissions: catalogPermissions,
    rowSecurity: false,
    columns: [
      int("year", { required: true, min: 1900, max: 2100 }),
      int("carCount", { min: 0, xdefault: 0 }),
    ],
    indexes: [{ key: "idx_year", type: "key", columns: ["year"], orders: ["desc"] }],
  },
];

export const BUCKET = {
  name: "Car images",
  permissions: [
    Permission.read(Role.any()),
    Permission.create(Role.team(ADMINS_TEAM_ID)),
    Permission.update(Role.team(ADMINS_TEAM_ID)),
    Permission.delete(Role.team(ADMINS_TEAM_ID)),
  ],
  fileSecurity: false,
  maximumFileSize: 10 * 1024 * 1024,
  allowedFileExtensions: ["jpg", "jpeg", "png", "webp"],
  compression: "none",
  encryption: false,
  antivirus: false,
  transformations: true,
};
