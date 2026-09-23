import { View } from "react-native";
import type { ReactNode } from "react";
import type { Scheme } from "@/theme/tokens";
import { themeVars } from "@/theme/tokens";

/**
 * Reaplica `themeVars` numa subárvore. Usado por superfícies ink
 * (splash, onboarding, login, topo da Home, TabBar) e por portais
 * (Modal/BottomSheet) que ficam fora da árvore do View raiz.
 *
 * Por padrão recebe "dark" (mesma variável do Provider) para que a
 * superfície continue coerente com o tema; a subárvore não precisa
 * saber qual é — só precisa estar em dark.
 */
type Props = {
  scheme?: Scheme;
  className?: string;
  children: ReactNode;
};

export function ThemeScope({ scheme = "dark", className, children }: Props) {
  return (
    <View style={themeVars[scheme]} className={className}>
      {children}
    </View>
  );
}
