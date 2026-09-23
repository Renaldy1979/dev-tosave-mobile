import type { Attribute } from "@/types";

/**
 * Atributos transversais do catálogo (Real Riders, Treasure Hunt etc.).
 * Usados pelo filtro da Busca (multi-seleção, AND entre si) e exibidos
 * como badges na tela de detalhe.
 */
export const attributesMock: Attribute[] = [
  {
    id: "attr-real-riders",
    title: "Real Riders",
    description: "Rodas de borracha em vez de plástico — premium.",
  },
  {
    id: "attr-treasure-hunt",
    title: "Treasure Hunt",
    description: "Edição rara com pintura e gráfico especiais.",
  },
  {
    id: "attr-super-treasure-hunt",
    title: "Super Treasure Hunt",
    description: "Variante mais cobiçada: pintura spectraflake + Real Riders.",
  },
  {
    id: "attr-chase",
    title: "Chase",
    description: "Variante paralela da peça principal, com pintura alternativa.",
  },
  {
    id: "attr-premium",
    title: "Premium",
    description: "Linha premium da marca, com mais detalhes e tampas removíveis.",
  },
  {
    id: "attr-fast-wedge",
    title: "Fast Wedge",
    description: "Série clássica de carros com carroceria em cunha.",
  },
  {
    id: "attr-rlc-exclusive",
    title: "RLC Exclusive",
    description: "Edição exclusiva do Red Line Club, voltada a membros.",
  },
  {
    id: "attr-thunt-2024",
    title: "THunt 2024",
    description: "Treasure Hunt do ano-base 2024 (lote regular).",
  },
  {
    id: "attr-zamac",
    title: "Zamac",
    description: "Corpo metálico em Zamac, peso e sonoridade premium.",
  },
  {
    id: "attr-conv",
    title: "Conversível",
    description: "Carroceria conversível (tampa aberta, sem teto rígido).",
  },
];
