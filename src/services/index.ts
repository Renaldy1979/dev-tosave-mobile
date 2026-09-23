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
  changePassword,
  getCurrentUser,
  getSession,
  signIn,
  signOut,
  signUp,
} from "./auth";
export type {
  ChangePasswordError,
  ChangePasswordResult,
  SignInError,
  SignInResult,
  SignUpError,
  SignUpResult,
} from "./auth";

export { updateProfile } from "./users";
export type { UpdateProfileInput, UpdateProfileResult } from "./users";
