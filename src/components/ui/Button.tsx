import { ActivityIndicator, Pressable, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import { flameGradient } from "@/theme/tokens";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/utils/cn";
import { Text } from "./Text";

/**
 * Botão da aplicação. Espelha `componentes.md §1`.
 *
 * Variantes:
 * - primary   → CTA único por tela ("Adicionar à coleção").
 * - secondary → ação paralela ("Compartilhar", "Tentar novamente").
 * - outline   → terciária visível ("Ver tudo", "Limpar filtros").
 * - ghost     → ação sem peso ("Pular", "Cancelar").
 * - danger    → confirmação destrutiva ("Remover").
 * - flame     → CTA assinatura do login/onboarding (gradiente + glow).
 *
 * Tamanhos: sm 36 / md 44 / lg 52. `lg` = polegar (52 pt).
 *
 * Comportamento:
 * - Press scale 0.97 (card 0.98) com `spring.snappy`; volta ao soltar.
 * - Variante flame ganha glow primário (`shadowColor` + radius 16).
 * - Tamanho `sm` recebe `hitSlop` para garantir 44 pt de toque.
 */
type Props = {
  label: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "flame";
  size?: "sm" | "md" | "lg";
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  className?: string;
};

const SIZE: Record<"sm" | "md" | "lg", { h: number; px: string; text: "body-sm" | "body" | "body-lg" }> = {
  sm: { h: 36, px: "px-3", text: "body-sm" },
  md: { h: 44, px: "px-4", text: "body" },
  lg: { h: 52, px: "px-6", text: "body-lg" },
};

/** hitSlop para garantir área de toque ≥ 44 pt (alvos de 36pt → +4 em cima/baixo). */
function hitSlopFor(box: number) {
  const diff = Math.max(0, 44 - box);
  return { top: diff / 2, bottom: diff / 2, left: diff / 2, right: diff / 2 };
}

export function Button({
  label,
  variant = "primary",
  size = "md",
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  loading = false,
  disabled = false,
  fullWidth = false,
  onPress,
  accessibilityLabel,
  className,
}: Props) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const sz = SIZE[size];
  const isInkFlame = variant === "flame";
  const isInactive = disabled || loading;
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePressIn = () => {
    if (reduced || isInactive) return;
    scale.value = withSpring(0.97, { damping: 18, stiffness: 260, mass: 1 });
  };
  const handlePressOut = () => {
    if (reduced || isInactive) return;
    scale.value = withSpring(1, { damping: 18, stiffness: 260, mass: 1 });
  };

  const containerClass = (() => {
    if (variant === "primary") return "bg-primary active:bg-primary-pressed";
    if (variant === "secondary") return "bg-surface-3 active:bg-border-strong";
    if (variant === "outline") return "border border-border-strong active:border-primary active:bg-primary-soft/40";
    if (variant === "ghost") return "active:bg-surface-3";
    if (variant === "danger") return "bg-danger active:opacity-85";
    return ""; // flame usa gradiente por baixo
  })();

  const textTone: "fg" | "muted" | "subtle" | "primary" | "danger" =
    variant === "primary" || variant === "flame"
      ? "primary"
      : variant === "danger"
        ? "fg"
        : variant === "ghost"
          ? "muted"
          : "fg";

  const textWeight =
    variant === "primary" || variant === "danger" || variant === "flame"
      ? "font-sans-semibold"
      : variant === "secondary"
        ? "font-sans-medium"
        : "font-sans";

  const textClass =
    variant === "danger" ? "text-white" : textTone === "primary" ? "text-primary-fg" : "";

  const iconColor =
    variant === "primary" || variant === "flame"
      ? c("primary-fg")
      : variant === "danger"
        ? "#FFFFFF"
        : variant === "ghost"
          ? c("fg-muted")
          : c("fg");

  const accessibilityState = {
    disabled: isInactive,
    busy: loading,
  };

  const inner = (
    <View className="flex-row items-center justify-center gap-2">
      {loading ? (
        <ActivityIndicator
          color={variant === "primary" || variant === "flame" ? c("primary-fg") : iconColor}
          size="small"
        />
      ) : LeftIcon ? (
        <LeftIcon color={iconColor} size={size === "sm" ? 16 : size === "md" ? 18 : 20} strokeWidth={1.75} />
      ) : null}
      <Text variant={sz.text} className={cn(textClass, textWeight)}>
        {label}
      </Text>
      {!loading && RightIcon ? (
        <RightIcon color={iconColor} size={size === "sm" ? 16 : size === "md" ? 18 : 20} strokeWidth={1.75} />
      ) : null}
    </View>
  );

  // Variante flame: gradiente + glow leve, sem className de fundo.
  if (isInkFlame) {
    return (
      <Animated.View
        style={[
          animatedStyle,
          // Glow primário (ver `glow()` em theme/elevation).
          {
            shadowColor: "#FD8401",
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.45,
            shadowRadius: 16,
            elevation: 6,
          },
          fullWidth && { alignSelf: "stretch" },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityState={accessibilityState}
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={isInactive}
          hitSlop={size === "sm" ? hitSlopFor(sz.h) : undefined}
          className={cn(
            "rounded-md overflow-hidden active:opacity-90",
            fullWidth && "self-stretch",
            isInactive && !loading && "opacity-40",
            className
          )}
          style={{ minHeight: sz.h }}
        >
          <LinearGradient
            colors={flameGradient.colors as unknown as readonly [string, string, ...string[]]}
            locations={flameGradient.locations as unknown as readonly [number, number, ...number[]]}
            start={flameGradient.start}
            end={flameGradient.end}
            className="flex-1 items-center justify-center rounded-md"
            style={{ paddingHorizontal: sz.h === 36 ? 12 : sz.h === 44 ? 16 : 24 }}
          >
            {inner}
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        animatedStyle,
        fullWidth && { alignSelf: "stretch" },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={accessibilityState}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isInactive}
        hitSlop={size === "sm" ? hitSlopFor(sz.h) : undefined}
        className={cn(
          "rounded-md items-center justify-center",
          sz.px,
          fullWidth && "self-stretch",
          containerClass,
          isInactive && !loading && "opacity-40",
          className
        )}
        style={{ minHeight: sz.h }}
      >
        {inner}
      </Pressable>
    </Animated.View>
  );
}
