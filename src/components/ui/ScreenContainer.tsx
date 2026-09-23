import { View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { cn } from "@/utils/cn";
import { ThemeScope } from "./ThemeScope";

/**
 * Base de toda tela (`componentes.md §C.15`).
 *
 * - `bg`: `bg` (segue o tema) ou `bg-ink` para superfícies escuras
 *   independentes do tema (splash, onboarding, login, TabBar).
 * - `edges`: safe area aplicada. Padrão: top + bottom. Para telas
 *   com Header, o Header cuida do topo; passar `edges=["bottom"]`.
 * - `contentClassName`: classes aplicadas no conteúdo interior
 *   (alinhamento, padding lateral, etc.).
 */
type Props = {
  bg?: "bg" | "ink";
  edges?: Array<"top" | "bottom" | "left" | "right">;
  contentClassName?: string;
  className?: string;
  children: React.ReactNode;
};

export function ScreenContainer({
  bg = "bg",
  edges = ["top", "bottom"],
  contentClassName,
  className,
  children,
}: Props) {
  const insets = useSafeAreaInsets();
  const isInk = bg === "ink";
  const Container = isInk ? View : SafeAreaView;
  // Quando ink, o ThemeScope reaplica themeVars.dark (independente do tema)
  // — equivalente a `ThemeScope dark` envolvendo a tela inteira.
  const inner = (
    <Container
      edges={isInk ? undefined : edges}
      className={cn("flex-1", isInk ? "bg-ink" : "bg-bg", className)}
    >
      <StatusBar style={isInk ? "light" : "dark"} />
      <View
        className={cn("flex-1", contentClassName)}
        style={{
          paddingTop: isInk && edges.includes("top") ? insets.top : 0,
          paddingBottom: isInk && edges.includes("bottom") ? insets.bottom : 0,
        }}
      >
        {children}
      </View>
    </Container>
  );

  if (isInk) {
    return <ThemeScope>{inner}</ThemeScope>;
  }
  return inner;
}
