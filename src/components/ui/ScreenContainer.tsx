import { View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { cn } from "@/utils/cn";
import { ThemeScope } from "./ThemeScope";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * Base de toda tela (`componentes.md §C.15`).
 *
 * - `bg`: `bg` (segue o tema) ou `bg-ink` para superfícies escuras
 *   independentes do tema (splash, onboarding, login, TabBar).
 * - `edges`: safe area aplicada. Padrão: top + bottom. Para telas
 *   com Header, o Header cuida do topo; passar `edges=["bottom"]`.
 * - `contentClassName`: classes aplicadas no conteúdo interior
 *   (alinhamento, padding lateral, etc.).
 *
 * StatusBar:
 * - ink → "light" (superfície escura, ícone claro);
 * - bg + scheme dark → "light";
 * - bg + scheme light → "dark".
 *
 * A Home usa `bg="bg"` mas tem o topo ink (faixa do logo). A Aquarela
 * marcou essa StatusBar como `light` (item 2 da revisão) — para não
 * acoplar essa decisão aqui, a Home é a única tela que troca a
 * StatusBar via prop `statusBar="light"` quando quiser.
 */
type Props = {
  bg?: "bg" | "ink";
  edges?: Array<"top" | "bottom" | "left" | "right">;
  contentClassName?: string;
  className?: string;
  /** Override explícito da StatusBar. Padrão: segue o tema. */
  statusBar?: "auto" | "light" | "dark";
  children: React.ReactNode;
};

export function ScreenContainer({
  bg = "bg",
  edges = ["top", "bottom"],
  contentClassName,
  className,
  statusBar = "auto",
  children,
}: Props) {
  const insets = useSafeAreaInsets();
  const { scheme } = useTheme();
  const isInk = bg === "ink";
  const Container = isInk ? View : SafeAreaView;

  // StatusBar: ink sempre "light"; bg segue o scheme global.
  const statusBarStyle =
    statusBar === "auto" ? (isInk || scheme === "dark" ? "light" : "dark") : statusBar;

  const inner = (
    <Container
      edges={isInk ? undefined : edges}
      className={cn("flex-1", isInk ? "bg-ink" : "bg-bg", className)}
    >
      <StatusBar style={statusBarStyle} />
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
    // O `View` que envolve o conteúdo dentro de ThemeScope precisa de
    // `flex-1` para preencher o Modal/Screen todo (sem isso, em modal
    // pageSheet do iOS a árvore colapsa para 0×0 e a tela sai em
    // branco). Reaplica também a `className` recebida.
    return <ThemeScope className={cn("flex-1", className)}>{inner}</ThemeScope>;
  }
  return inner;
}
