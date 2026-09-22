import { vars } from "nativewind";

export type Scheme = "dark" | "light";

/** Tokens semânticos por tema (docs/design/design-system-mobile.md §3.2, §4.2). */
export const palette = {
  dark: {
    bg: "11 11 13", surface: "22 22 26", "surface-2": "28 28 33", "surface-3": "38 38 45",
    ink: "11 11 13", "ink-fg": "246 246 248",
    border: "38 38 45", "border-strong": "58 58 67",
    fg: "246 246 248", "fg-muted": "180 180 190", "fg-subtle": "138 138 150",
    primary: "253 132 1", "primary-pressed": "255 154 26", "primary-fg": "11 11 13",
    "primary-text": "255 154 26", "primary-soft": "61 28 0",
    accent: "255 222 33", "accent-soft": "89 75 0",
    flame: "255 56 56", "flame-soft": "77 0 0",
    success: "34 197 94", warning: "255 222 33", danger: "255 56 56", info: "96 165 250",
    overlay: "0 0 0",
  },
  light: {
    bg: "246 246 248", surface: "255 255 255", "surface-2": "240 240 243", "surface-3": "235 235 239",
    ink: "17 17 20", "ink-fg": "246 246 248",
    border: "224 224 230", "border-strong": "200 200 208",
    fg: "17 17 20", "fg-muted": "75 75 85", "fg-subtle": "110 110 122",
    primary: "253 132 1", "primary-pressed": "224 110 0", "primary-fg": "11 11 13",
    "primary-text": "184 86 0", "primary-soft": "255 231 194",
    accent: "128 108 0", "accent-soft": "255 245 191",
    flame: "224 0 0", "flame-soft": "255 240 240",
    success: "21 128 61", warning: "128 108 0", danger: "224 0 0", info: "37 99 235",
    overlay: "17 17 20",
  },
} as const;

type TokenName = keyof typeof palette.dark;

/** Estilos com CSS variables para aplicar em um View (className usa rgb(var(--x))). */
export const themeVars = {
  dark: vars(Object.fromEntries(Object.entries(palette.dark).map(([k, v]) => [`--${k}`, v]))),
  light: vars(Object.fromEntries(Object.entries(palette.light).map(([k, v]) => [`--${k}`, v]))),
};

/** Cor em string para props que não aceitam className (ícones, tintColor, StatusBar, placeholderTextColor). */
export const color = (scheme: Scheme, name: TokenName, alpha = 1) =>
  `rgba(${palette[scheme][name].split(" ").join(", ")}, ${alpha})`;

/** Gradiente assinatura da marca (§2). Usar com parcimônia. */
export const flameGradient = {
  colors: ["#FFDE21", "#FD8401", "#FF0000"] as const,
  locations: [0, 0.45, 1] as const,
  start: { x: 0, y: 0.4 },
  end: { x: 1, y: 0.6 },
};
