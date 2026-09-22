import { Easing } from "react-native-reanimated";

/** Tokens de movimento (docs/design/design-system-mobile.md §9.1). */
export const duration = { fast: 120, base: 200, slow: 320 } as const;
export const easing = {
  out: Easing.bezier(0.22, 1, 0.36, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
};
export const spring = {
  snappy: { damping: 18, stiffness: 260, mass: 1 },
  sheet: { damping: 24, stiffness: 220 },
};
