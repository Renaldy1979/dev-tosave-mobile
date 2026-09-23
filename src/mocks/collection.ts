import type { CollectionItem } from "@/types";

/**
 * Coleção inicial do usuário de exemplo (`user-ana`). Cobrindo carros
 * de várias séries/marcas para a tela Coleção mostrar variedade, e
 * com vários itens em `quantity > 1` para o filtro "Repetidos"
 * funcionar já na primeira renderização.
 *
 * IDs de carros referenciados existem em `cars.ts`.
 */
export const collectionMock: CollectionItem[] = [
  {
    id: "ci-datsun",
    userId: "user-ana",
    carId: "car-datsun-510",
    quantity: 3,
    createdAt: "2024-05-01T10:00:00.000Z",
  },
  {
    id: "ci-skyline",
    userId: "user-ana",
    carId: "car-nissan-skyline-r34",
    quantity: 2,
    createdAt: "2024-05-03T10:00:00.000Z",
  },
  {
    id: "ci-supra",
    userId: "user-ana",
    carId: "car-toyota-supra-a80",
    quantity: 1,
    createdAt: "2024-05-05T10:00:00.000Z",
  },
  {
    id: "ci-mx5",
    userId: "user-ana",
    carId: "car-mazda-mx5-na",
    quantity: 2,
    createdAt: "2024-05-08T10:00:00.000Z",
  },
  {
    id: "ci-fairlady",
    userId: "user-ana",
    carId: "car-nissan-fairlady-z",
    quantity: 1,
    createdAt: "2024-05-12T10:00:00.000Z",
  },
  {
    id: "ci-e30",
    userId: "user-ana",
    carId: "car-bmw-e30-m3",
    quantity: 1,
    createdAt: "2024-05-15T10:00:00.000Z",
  },
  {
    id: "ci-rangie",
    userId: "user-ana",
    carId: "car-rangie-classic",
    quantity: 1,
    createdAt: "2024-05-18T10:00:00.000Z",
  },
  {
    id: "ci-boss",
    userId: "user-ana",
    carId: "car-mustang-boss-302",
    quantity: 1,
    createdAt: "2024-05-20T10:00:00.000Z",
  },
  {
    id: "ci-lambo",
    userId: "user-ana",
    carId: "car-tomica-lambo-countach",
    quantity: 4,
    createdAt: "2024-05-22T10:00:00.000Z",
  },
  {
    id: "ci-rwb",
    userId: "user-ana",
    carId: "car-minigt-rwb-porsche",
    quantity: 1,
    createdAt: "2024-05-25T10:00:00.000Z",
  },
];
