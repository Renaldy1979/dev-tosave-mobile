import { Platform, ViewStyle } from "react-native";
import type { Scheme } from "./tokens";

/** No dark, elevação é superfície + borda (className); sombra preta sobre fundo escuro é invisível. */
export function elevation(level: "e0" | "e1" | "e2" | "e3", scheme: Scheme): ViewStyle {
  if (scheme === "dark" || level === "e0") return {};
  const ios: Record<"e1" | "e2" | "e3", ViewStyle> = {
    e1: { shadowColor: "#111114", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
    e2: { shadowColor: "#111114", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
    e3: { shadowColor: "#111114", shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.2, shadowRadius: 24 },
  };
  if (Platform.OS === "ios") return ios[level];
  return { shadowColor: "#111114", elevation: { e1: 1, e2: 4, e3: 12 }[level] };
}

/** Glow dos CTAs flame e do FavoriteButton ativo (§8). */
export function glow(color = "#FD8401"): ViewStyle {
  if (Platform.OS === "ios") {
    return { shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 16 };
  }
  return { elevation: 6, shadowColor: color };
}
