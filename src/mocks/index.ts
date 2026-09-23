/**
 * Barrel dos mocks. Único ponto de entrada para `src/services/`.
 * Telas e componentes **nunca** importam daqui — sempre pelos services,
 * para que a fase 2 substitua apenas o conteúdo de `src/services/`.
 */
export { attributesMock } from "./attributes";
export { brandsMock } from "./brands";
export { carAttributesMock } from "./carAttributes";
export { carsMock, carImagesMock } from "./cars";
export { collectionMock } from "./collection";
export { seriesMock } from "./series";
export { usersMock } from "./users";
