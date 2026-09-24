/**
 * Barrel dos services. Telas e componentes importam daqui:
 *
 *   import { listCarsPaged, signIn } from "@/services";
 *
 * Os services da fase 2 falam com o Appwrite (fase 2 do projeto). A
 * pasta `src/mocks/` existe só para desenvolvimento e **nenhuma tela
 * nem service importa de lá** — qualquer leitura de mock é bug.
 */
export {
  countCars,
  getCarById,
  getCatalogTotalCars,
  getOwnedBySerie,
  getSerie,
  getSeriesByIds,
  listAllCarsBySerie,
  listSeriesPaged,
  getSeriesCarCount,
  listAttributes,
  listBrands,
  listBySerie,
  listBySeriePaged,
  listCars,
  listCarsPaged,
  listFeaturedSeries,
  listSeries,
  listYears,
} from "./catalog";
export type {
  ListCarsPagedOptions,
  PaginatedCars,
  PaginatedSeries,
  SerieListItem,
  SerieWithCount,
} from "./catalog";

export {
  getSeriesProgress,
  getStatsSummary,
  getYearProgress,
} from "./stats";
export type { SerieProgress, StatsSummary, YearProgress } from "./stats";

export {
  addToCollection,
  getCollection,
  getCollectionQuantity,
  getCollectionSummary,
  getSerieOwnership,
  removeFromCollection,
  setCollectionQuantity,
} from "./collection";
export type { CollectionListFilters } from "./collection";

export {
  changePassword,
  deleteAccount,
  getCurrentUser,
  getSession,
  signIn,
  signOut,
  signUp,
} from "./auth";
export type {
  ChangePasswordError,
  ChangePasswordResult,
  DeleteAccountError,
  DeleteAccountResult,
  SignInError,
  SignInResult,
  SignUpError,
  SignUpResult,
} from "./auth";

export { updateProfile } from "./users";
export type { UpdateProfileInput, UpdateProfileResult } from "./users";
