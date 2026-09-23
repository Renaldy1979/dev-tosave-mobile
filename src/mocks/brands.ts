import type { Brand } from "@/types";

/**
 * Marcas presentes no catálogo. `state` segue o vocabulário do portal:
 * "ativa" (padrão), "descontinuada" (exibe badge "Descontinuada" no
 * detalhe) e "em_analise" (uso interno; o app não exibe ao colecionador).
 */
export const brandsMock: Brand[] = [
  {
    id: "brand-mattel",
    name: "Mattel",
    state: "ativa",
    image: "https://picsum.photos/seed/brand-mattel/256/256",
    active: true,
    createdAt: "2024-01-15T12:00:00.000Z",
  },
  {
    id: "brand-matchbox",
    name: "Matchbox",
    state: "ativa",
    image: "https://picsum.photos/seed/brand-matchbox/256/256",
    active: true,
    createdAt: "2024-01-15T12:00:00.000Z",
  },
  {
    id: "brand-mini-gt",
    name: "Mini GT",
    state: "ativa",
    image: "https://picsum.photos/seed/brand-minigt/256/256",
    active: true,
    createdAt: "2024-02-02T12:00:00.000Z",
  },
  {
    id: "brand-tomica",
    name: "Tomica",
    state: "ativa",
    image: "https://picsum.photos/seed/brand-tomica/256/256",
    active: true,
    createdAt: "2024-02-10T12:00:00.000Z",
  },
  {
    id: "brand-greenlight",
    name: "Greenlight",
    state: "em_analise",
    image: "https://picsum.photos/seed/brand-greenlight/256/256",
    active: true,
    createdAt: "2024-03-01T12:00:00.000Z",
  },
  {
    id: "brand-majorette",
    name: "Majorette",
    state: "descontinuada",
    image: "https://picsum.photos/seed/brand-majorette/256/256",
    active: false,
    createdAt: "2024-01-15T12:00:00.000Z",
  },
];
