import type { Serie } from "@/types";

/**
 * Séries do catálogo. `isDefault` marca as séries que aparecem no
 * carrossel "Séries em destaque" da Home — várias podem ser destaque
 * ao mesmo tempo, conforme a especificação.
 */
export const seriesMock: Serie[] = [
  {
    id: "serie-jimports",
    title: "HW J-Imports",
    description: "Veículos japoneses icônicos em escala 1/64.",
    imagem: "https://picsum.photos/seed/serie-jimports/800/450",
    isDefault: true,
    createdAt: "2024-01-20T12:00:00.000Z",
  },
  {
    id: "serie-car-culture",
    title: "Car Culture",
    description: "Edições premium com tampas removíveis e Real Riders.",
    imagem: "https://picsum.photos/seed/serie-car-culture/800/450",
    isDefault: true,
    createdAt: "2024-01-22T12:00:00.000Z",
  },
  {
    id: "serie-fast-wedge",
    title: "Fast Wedge",
    description: "Linha clássica de carros com carroceria em cunha.",
    imagem: "https://picsum.photos/seed/serie-fast-wedge/800/450",
    isDefault: true,
    createdAt: "2024-01-25T12:00:00.000Z",
  },
  {
    id: "serie-collectors",
    title: "Matchbox Collectors",
    description: "Miniaturas para colecionadores, tampas removíveis.",
    imagem: "https://picsum.photos/seed/serie-collectors/800/450",
    isDefault: false,
    createdAt: "2024-02-05T12:00:00.000Z",
  },
  {
    id: "serie-rlc",
    title: "RLC Exclusive",
    description: "Edições exclusivas do Red Line Club para membros.",
    imagem: "https://picsum.photos/seed/serie-rlc/800/450",
    isDefault: false,
    createdAt: "2024-02-12T12:00:00.000Z",
  },
  {
    id: "serie-tomica-premium",
    title: "Tomica Premium",
    description: "Réplicas detalhadas de carros japoneses em 1/43.",
    imagem: "https://picsum.photos/seed/serie-tomica-premium/800/450",
    isDefault: false,
    createdAt: "2024-03-01T12:00:00.000Z",
  },
];
