/**
 * Barrel dos services. Telas e componentes importam daqui:
 *
 *   import { listCars, signIn } from "@/services";
 *
 * Nenhuma tela deve importar diretamente de `@/mocks` — esta é a
 * fronteira que isola a fase 1 (mocks) da fase 2 (API real).
 */
export {
  countCars,
  getCarById,
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
export type { ListCarsPagedOptions, PaginatedCars } from "./catalog";

export {
  addToCollection,
  getCollection,
  getCollectionQuantity,
  getCollectionSummary,
  removeFromCollection,
  setCollectionQuantity,
} from "./collection";
export type { CollectionListFilters } from "./collection";

export {
  getCurrentUser,
  getSession,
  signIn,
  signOut,
  signUp,
} from "./auth";
export type { SignInError, SignInResult, SignUpError, SignUpResult } from "./auth";

export { updateProfile } from "./users";
export type { UpdateProfileInput, UpdateProfileResult } from "./users";
