/**
 * Barrel dos services. Telas e componentes importam daqui:
 *
 *   import { listCarsPaged, signIn } from "@/services";
 *
 * Arquitetura v2: os dados vêm do backend próprio por REST (`_http.ts`,
 * rotas `/v2`); o Appwrite fica só com o login e as imagens. A pasta
 * `src/mocks/` existe só para desenvolvimento e **nenhuma tela nem
 * service importa de lá** — qualquer leitura de mock é bug.
 */
export {
  countCars,
  getCarById,
  getSerie,
  listSerieCars,
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
  PaginatedSerieCars,
  PaginatedSeries,
  SerieCarsFilter,
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
  getCollectionPaged,
  getCollectionSummary,
  removeFromCollection,
  setCollectionQuantity,
} from "./collection";
export type {
  CollectionListFilters,
  CollectionMutationResult,
  CollectionSort,
} from "./collection";

export {
  changePassword,
  completePasswordRecovery,
  deleteAccount,
  getCurrentUser,
  getSession,
  requestPasswordRecovery,
  signIn,
  signOut,
  signUp,
} from "./auth";
export type {
  ChangePasswordError,
  ChangePasswordResult,
  DeleteAccountError,
  RecoveryCompleteError,
  RecoveryRequestError,
  DeleteAccountResult,
  SignInError,
  SignInResult,
  SignUpError,
  SignUpResult,
} from "./auth";

export { updateProfile } from "./users";
export type { UpdateProfileInput, UpdateProfileResult } from "./users";
