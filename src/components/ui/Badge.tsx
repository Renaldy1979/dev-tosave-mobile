import { View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { useTheme } from "@/theme/ThemeProvider";
import { cn } from "@/utils/cn";
import { Text } from "./Text";

/**
 * Badge pequeno de 24 pt (`componentes.md §5`).
 *
 * Variantes:
 * - neutral  → ano, escala, atributo
 * - primary  → série, filtro ativo
 * - accent   → número de coleção `#001`
 * - flame    → "Em destaque", "Repetido ×2"
 * - glass    → sobre imagem (`#001`, `8/10`)
 * - outline  → contagem
 * - count    → círculo para o badge numérico sobre o ícone da TabBar
 */
type BadgeVariant =
  | "neutral"
  | "primary"
  | "accent"
  | "flame"
  | "glass"
  | "outline";

type Props = {
  variant?: BadgeVariant;
  size?: "sm" | "md";
  children: ReactNode;
  icon?: LucideIcon;
  className?: string;
};

const variantClass: Record<BadgeVariant, string> = {
  neutral: "bg-surface-3",
  primary: "bg-primary-soft",
  accent: "bg-accent-soft",
  flame: "bg-flame-soft",
  glass: "bg-black/50",
  outline: "border border-border bg-transparent",
};

const variantTone: Record<BadgeVariant, "muted" | "primary" | "accent" | "flame" | "fg"> = {
  neutral: "muted",
  primary: "primary",
  accent: "accent",
  flame: "flame",
  glass: "fg",
  outline: "muted",
};

const variantTextClass: Record<BadgeVariant, string> = {
  neutral: "text-fg-muted",
  primary: "text-primary-text",
  accent: "text-accent font-mono",
  flame: "text-flame",
  glass: "text-white",
  outline: "text-fg-muted",
};

export function Badge({
  variant = "neutral",
  size = "md",
  children,
  icon: Icon,
  className,
}: Props) {
  const { c } = useTheme();
  const height = size === "sm" ? 20 : 24;
  const iconColor =
    variant === "glass"
      ? "#FFFFFF"
      : variant === "primary"
        ? c("primary-text")
        : variant === "flame"
          ? c("flame")
          : variant === "accent"
            ? c("accent")
            : c("fg-muted");

  return (
    <View
      accessible={false}
      className={cn(
        "flex-row items-center gap-1 self-start rounded-xs px-2",
        variantClass[variant],
        className
      )}
      style={{ height }}
    >
      {Icon ? <Icon color={iconColor} size={14} strokeWidth={1.75} /> : null}
      <Text
        variant="caption"
        tone={variantTone[variant]}
        className={cn(variantTextClass[variant], variant === "accent" ? "" : "font-sans-medium")}
        numberOfLines={1}
      >
        {children}
      </Text>
    </View>
  );
}

/**
 * Círculo numérico para o badge da TabBar (ex.: "12" sobre o coração).
 * `max` corta para "99+".
 */
export function CountBadge({ count, max = 99 }: { count: number; max?: number }) {
  if (count <= 0) return null;
  const label = count > max ? `${max}+` : String(count);
  return (
    <View
      pointerEvents="none"
      accessible={false}
      className="min-w-[18px] h-[18px] rounded-full bg-primary items-center justify-center px-1"
    >
      <Text className="text-[11px] font-sans-semibold text-primary-fg">{label}</Text>
    </View>
  );
}
