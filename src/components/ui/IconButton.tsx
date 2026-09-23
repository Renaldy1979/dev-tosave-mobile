import { Pressable, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { cn } from "@/utils/cn";

/**
 * Botão só-de-ícone (`componentes.md §1.1`).
 * - `variant: "ghost"` (padrão) → fundo transparente, pressionado `bg-surface-3`.
 * - `variant: "secondary"` → fundo `bg-surface-3`.
 * - `variant: "glass"` → sobre imagem: `bg-black/45`, ícone branco, `rounded-full`.
 *
 * Tamanhos visuais: `sm` 32 / `md` 40 / `lg` 44, com `hitSlop` para
 * garantir área de toque ≥ 44 pt.
 */
type Props = {
  icon: LucideIcon;
  variant?: "ghost" | "secondary" | "glass";
  size?: "sm" | "md" | "lg";
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
  className?: string;
};

const VISUAL: Record<"sm" | "md" | "lg", { box: number; icon: number }> = {
  sm: { box: 32, icon: 16 },
  md: { box: 40, icon: 20 },
  lg: { box: 44, icon: 22 },
};

// hitSlop para garantir área de toque 44 pt.
function hitSlopFor(box: number) {
  const diff = Math.max(0, 44 - box);
  return { top: diff / 2, bottom: diff / 2, left: diff / 2, right: diff / 2 };
}

export function IconButton({
  icon: Icon,
  variant = "ghost",
  size = "md",
  accessibilityLabel,
  onPress,
  disabled,
  className,
}: Props) {
  const { c } = useTheme();
  const { box, icon } = VISUAL[size];

  const containerClass = (() => {
    if (variant === "glass") return "rounded-full bg-black/45";
    if (variant === "secondary") return "rounded-md bg-surface-3 active:bg-border-strong";
    return "rounded-md active:bg-surface-3";
  })();

  const iconColor =
    variant === "glass" ? "#FFFFFF" : disabled ? c("fg-subtle") : c("fg");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      hitSlop={hitSlopFor(box)}
      onPress={onPress}
      disabled={disabled}
      className={cn(
        "items-center justify-center",
        disabled && "opacity-40",
        containerClass,
        className
      )}
      style={{ width: box, height: box }}
    >
      <View pointerEvents="none">
        <Icon color={iconColor} size={icon} strokeWidth={1.75} />
      </View>
    </Pressable>
  );
}
