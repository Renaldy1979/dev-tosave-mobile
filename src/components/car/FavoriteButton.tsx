import { useRef } from "react";
import { Pressable, View } from "react-native";
import { Heart } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Coração do CarCard e da ActionBar (`componentes.md §13`).
 *
 * - `variant: "glass"` → sobre imagem (`bg-black/45`, branco).
 * - `variant: "solid"` → barra de ação (`bg-surface-3`, `text-fg`).
 *
 * Pop 1 → 1.25 → 1 ao ativar, com glow vermelho via `shadowColor`.
 * Movimento reduzido: salta direto para o estado final, sem pop.
 *
 * Toques repetidos são ignorados enquanto a `onToggle` está em curso.
 * A animação + haptic só dispara após o toggle resolver com sucesso —
 * sem sessão (handler do pai pede login) nenhum feedback de erro aparece
 * aqui.
 *
 * A ação de toggle é responsabilidade do chamador (handler de
 * adicionar/remover na coleção, com `useRequireSession` quando
 * sem sessão).
 */
type Props = {
  active: boolean;
  onToggle: () => void | Promise<void>;
  variant?: "glass" | "solid";
  size?: "sm" | "md" | "lg";
  accessibilityLabel?: string;
  disabled?: boolean;
};

const VISUAL: Record<"sm" | "md" | "lg", { box: number; icon: number }> = {
  sm: { box: 32, icon: 16 },
  md: { box: 40, icon: 20 },
  lg: { box: 44, icon: 22 },
};

function hitSlopFor(box: number) {
  const diff = Math.max(0, 44 - box);
  return { top: diff / 2, bottom: diff / 2, left: diff / 2, right: diff / 2 };
}

export function FavoriteButton({
  active,
  onToggle,
  variant = "glass",
  size = "sm",
  accessibilityLabel,
  disabled,
}: Props) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const busyRef = useRef(false);
  const { box, icon } = VISUAL[size];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const containerClass =
    variant === "glass" ? "rounded-full bg-black/45" : "rounded-md bg-surface-3 active:bg-border-strong";

  const iconColor = active
    ? c("flame")
    : variant === "glass"
      ? "#FFFFFF"
      : c("fg");

  const handlePress = async () => {
    if (disabled || busyRef.current) return;
    busyRef.current = true;
    try {
      await onToggle();
      // Sucesso: anima conforme o estado final (que o pai já refletiu).
      if (active) {
        // Remoção: pop suave
        if (!reduced) {
          scale.value = withSpring(1, { damping: 12, stiffness: 220 });
        }
      } else {
        // Adição: pop 1 → 1.25 → 1 + haptic Light
        if (!reduced) {
          scale.value = withSpring(1.25, { damping: 14, stiffness: 240 }, () => {
            scale.value = withSpring(1, { damping: 14, stiffness: 220 });
          });
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      }
    } catch {
      // pai já cuida do erro e do rollback; não anima.
    } finally {
      busyRef.current = false;
    }
  };

  const label =
    accessibilityLabel ?? (active ? "Remover da coleção" : "Adicionar à coleção");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active, disabled }}
      hitSlop={hitSlopFor(box)}
      onPress={handlePress}
      disabled={disabled}
      className={`items-center justify-center ${containerClass} ${disabled ? "opacity-40" : ""}`}
      style={{
        width: box,
        height: box,
        shadowColor: active ? c("flame") : "transparent",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: active ? 0.55 : 0,
        shadowRadius: 16,
        elevation: active ? 6 : 0,
      }}
    >
      <Animated.View style={animatedStyle}>
        <View pointerEvents="none">
          <Heart
            color={iconColor}
            size={icon}
            strokeWidth={1.75}
            fill={active ? iconColor : "transparent"}
          />
        </View>
      </Animated.View>
    </Pressable>
  );
}
