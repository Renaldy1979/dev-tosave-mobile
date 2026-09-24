import type { ImageSourcePropType } from "react-native";

/**
 * Ícones dos atributos especiais (`docs/design/componentes.md` §5.1).
 *
 * Reconhecimento pelo `$id` do atributo (estável: uuid da origem,
 * gravado com id determinístico) e, como reserva, pelo título
 * normalizado. Os títulos no catálogo são "T-Hunt" e "Super T-Hunt".
 */
export const ATTR_THUNT = "64358b3b-5765-4e2c-b27c-d23f67c77e55";
export const ATTR_STHUNT = "70c4020e-3824-4b33-b44e-08b20903f515";

export type HuntKind = "thunt" | "sthunt";

export type AttributeIcon = {
  kind: HuntKind;
  source: ImageSourcePropType;
  /** Nome por extenso, para leitor de tela. */
  spokenName: string;
};

/* eslint-disable @typescript-eslint/no-require-imports */
const ICONS: Record<HuntKind, AttributeIcon> = {
  thunt: {
    kind: "thunt",
    source: require("../../assets/attributes/thunt.png"),
    spokenName: "Treasure Hunt",
  },
  sthunt: {
    kind: "sthunt",
    source: require("../../assets/attributes/sthunt.png"),
    spokenName: "Super Treasure Hunt",
  },
};
/* eslint-enable @typescript-eslint/no-require-imports */

const BY_ID: Record<string, HuntKind> = {
  [ATTR_THUNT]: "thunt",
  [ATTR_STHUNT]: "sthunt",
};

const BY_TITLE: Record<string, HuntKind> = {
  "t-hunt": "thunt",
  "treasure hunt": "thunt",
  "super t-hunt": "sthunt",
  "super treasure hunt": "sthunt",
};

/** Ícone de um atributo (por id ou título), ou `null` se não for especial. */
export function attributeIcon(attr: { id: string; title?: string }): AttributeIcon | null {
  const kind = BY_ID[attr.id] ?? (attr.title ? BY_TITLE[attr.title.trim().toLowerCase()] : undefined);
  return kind ? ICONS[kind] : null;
}

/**
 * Ícone do card a partir dos ids de atributo do carro. Com os dois, só
 * o Super Treasure Hunt.
 */
export function huntIconForCar(attributeIds: string[] | undefined): AttributeIcon | null {
  if (!attributeIds || attributeIds.length === 0) return null;
  if (attributeIds.includes(ATTR_STHUNT)) return ICONS.sthunt;
  if (attributeIds.includes(ATTR_THUNT)) return ICONS.thunt;
  return null;
}
