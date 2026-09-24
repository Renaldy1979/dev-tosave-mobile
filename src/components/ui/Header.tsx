import { useState } from "react";
import { View } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "./Text";
import { IconButton } from "./IconButton";
import { RootHeader, type RootHeaderAction } from "@/components/navigation/RootHeader";

/**
 * Header (componentes.md §7).
 *
 * Variantes:
 * - `root`        → telas raiz do drawer (`09-menu-drawer.md` §1): `≡`,
 *                   título (ou Logo com `logo`) e até 1 `action`; `ink`
 *                   na Home. Fixo, não colapsa.
 * - `stack`       → `bg-surface` + borda, voltar à esquerda, título
 *                   centralizado.
 * - `large`       → barra 52 transparente + título grande h1 que
 *                   colapsa ao rolar; usado em Busca, Coleção e Perfil.
 * - `transparent` → sobre imagem; voltar e ações em `glass`. Ao rolar,
 *                   fundo vira `surface`, ícones viram `ghost` e aparece
 *                   o título h3.
 *
 * `scrollY` é um `SharedValue<number>` da tela que cresce conforme rola.
 * Quando omitido, o Header não reage à rolagem (mantém estado
 * expandido/colapsado inicial conforme `scrollY` interno).
 *
 * Sincronização UI → JS: `useAnimatedReaction` + `scheduleOnRN` (do
 * `react-native-worklets`; `runOnJS` do reanimated está deprecated).
 * Evita o WARN "[Reanimated] Reading from value during component render"
 * e o `setInterval` de 80 ms (item 33 da revisão do lote 02).
 */
type HeaderVariant = "root" | "stack" | "large" | "transparent";

type Props = {
  variant?: HeaderVariant;
  title?: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
  scrollY?: SharedValue<number>;
  /** Limite (em pt) para começar a colapsar (large) ou fazer fade-in (transparent). */
  collapseAt?: number;
  className?: string;
  /** `root`: Logo no lugar do título (Home). */
  logo?: boolean;
  /** `root`: faixa ink (Home). */
  ink?: boolean;
  /** `root`: ação única à direita. */
  action?: RootHeaderAction;
};

export function Header({
  variant = "stack",
  title,
  subtitle,
  back = true,
  right,
  scrollY,
  collapseAt = 44,
  className,
  logo,
  ink,
  action,
}: Props) {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();

  // `scrollY` é opcional: large/transparent só fazem sentido com ele.
  const fallback = useSharedValue(0);
  const progress = scrollY ?? fallback;
  const collapse = useDerivedValue(() => {
    "worklet";
    const v = progress.value / collapseAt;
    return v < 0 ? 0 : v > 1 ? 1 : v;
  });

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(drawer)");
    }
  };

  if (variant === "root") {
    return <RootHeader title={title} logo={logo} ink={ink} action={action} />;
  }

  if (variant === "large") {
    return (
      <LargeHeader
        insets={insets}
        title={title}
        subtitle={subtitle}
        right={right}
        collapse={collapse}
        surfaceBg={c("surface")}
        className={className}
      />
    );
  }

  if (variant === "transparent") {
    return (
      <TransparentHeader
        insets={insets}
        title={title}
        right={right}
        back={back}
        onBack={handleBack}
        collapse={collapse}
        surfaceBg={c("surface")}
        className={className}
      />
    );
  }

  return (
    <StackHeader
      insets={insets}
      title={title}
      back={back}
      right={right}
      onBack={handleBack}
      borderColor={c("border")}
      bg={c("surface")}
      className={className}
    />
  );
}

/* ================================================================== */
/*                          SUB-COMPONENTES                            */
/* ================================================================== */

function StackHeader({
  insets,
  title,
  back,
  right,
  onBack,
  borderColor,
  bg,
  className,
}: {
  insets: { top: number };
  title?: string;
  back: boolean;
  right?: React.ReactNode;
  onBack: () => void;
  borderColor: string;
  bg: string;
  className?: string;
}) {
  return (
    <View
      className={`flex-row items-center px-2 bg-surface border-b border-border ${className ?? ""}`}
      style={{ paddingTop: insets.top, height: 52 + insets.top, borderColor, backgroundColor: bg }}
    >
      {back ? (
        <IconButton
          icon={ChevronLeft}
          variant="ghost"
          size="md"
          accessibilityLabel="Voltar"
          onPress={onBack}
        />
      ) : (
        <View style={{ width: 40 }} />
      )}
      <View className="flex-1 items-center">
        {title ? (
          <Text variant="h3" numberOfLines={1} className="text-center">
            {title}
          </Text>
        ) : null}
      </View>
      <View className="flex-row items-center gap-1 pr-2">{right}</View>
    </View>
  );
}

function LargeHeader({
  insets,
  title,
  subtitle,
  right,
  collapse,
  surfaceBg,
  className,
}: {
  insets: { top: number };
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  collapse: SharedValue<number>;
  surfaceBg: string;
  className?: string;
}) {
  // `isCollapsed` para o título pequeno só aparece quando o título
  // grande sumiu. Sem o ponteEvents no JSX direto.
  const [isCollapsed, setIsCollapsed] = useState(false);
  useAnimatedReaction(
    () => collapse.value > 0.5,
    (next, prev) => {
      "worklet";
      if (next !== prev) scheduleOnRN(setIsCollapsed, next);
    }
  );

  const largeStyle = useAnimatedStyle(() => ({
    opacity: 1 - collapse.value,
    transform: [{ translateY: -collapse.value * 8 }],
  }));
  const smallStyle = useAnimatedStyle(() => ({
    opacity: collapse.value,
  }));
  const barStyle = useAnimatedStyle(() => ({
    backgroundColor: collapse.value > 0.01 ? surfaceBg : "transparent",
    borderBottomColor: collapse.value > 0.01 ? surfaceBg : "transparent",
  }));
  return (
    <Animated.View
      className={`bg-bg ${className ?? ""}`}
      style={[barStyle, { borderBottomWidth: 0 }]}
    >
      <View
        className="flex-row items-center px-2"
        style={{ paddingTop: insets.top, height: 52 + insets.top }}
      >
        <View style={{ width: 40 }} />
        <View className="flex-1 items-center">
          <Animated.View
            style={smallStyle}
            pointerEvents={isCollapsed ? "auto" : "none"}
          >
            {title ? (
              <Text variant="h3" numberOfLines={1} className="text-center">
                {title}
              </Text>
            ) : null}
          </Animated.View>
        </View>
        <View className="flex-row items-center gap-1 pr-2">{right}</View>
      </View>
      <Animated.View
        style={largeStyle}
        className="px-4 pb-3"
        pointerEvents="none"
      >
        {title ? (
          <Text variant="h1" numberOfLines={1}>
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text variant="body-sm" tone="muted" numberOfLines={1} className="mt-0.5">
            {subtitle}
          </Text>
        ) : null}
      </Animated.View>
    </Animated.View>
  );
}

function TransparentHeader({
  insets,
  title,
  right,
  back,
  onBack,
  collapse,
  surfaceBg,
  className,
}: {
  insets: { top: number };
  title?: string;
  right?: React.ReactNode;
  back: boolean;
  onBack: () => void;
  collapse: SharedValue<number>;
  surfaceBg: string;
  className?: string;
}) {
  const { c } = useTheme();
  const borderColor = c("border");
  // `isCollapsed` para alternar `pointerEvents` do título sem ler
  // o SharedValue no JSX (item 33 da revisão).
  const [isCollapsed, setIsCollapsed] = useState(false);
  useAnimatedReaction(
    () => collapse.value > 0.5,
    (next, prev) => {
      "worklet";
      if (next !== prev) scheduleOnRN(setIsCollapsed, next);
    }
  );

  const barStyle = useAnimatedStyle(() => ({
    backgroundColor: collapse.value > 0.5 ? surfaceBg : "transparent",
    borderBottomColor: collapse.value > 0.5 ? borderColor : "transparent",
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: collapse.value,
  }));
  return (
    <Animated.View
      style={[
        barStyle,
        {
          paddingTop: insets.top,
          height: 52 + insets.top,
          borderBottomWidth: 1,
        },
      ]}
      className={`flex-row items-center px-2 ${className ?? ""}`}
    >
      {back ? (
        <IconButton
          icon={ChevronLeft}
          variant={isCollapsed ? "ghost" : "glass"}
          size="md"
          accessibilityLabel="Voltar"
          onPress={onBack}
        />
      ) : (
        <View style={{ width: 40 }} />
      )}
      <View className="flex-1 items-center">
        <Animated.View
          style={titleStyle}
          pointerEvents={isCollapsed ? "auto" : "none"}
        >
          {title ? (
            <Text variant="h3" numberOfLines={1} className="text-center">
              {title}
            </Text>
          ) : null}
        </Animated.View>
      </View>
      <View className="flex-row items-center gap-1 pr-2">{right}</View>
    </Animated.View>
  );
}
