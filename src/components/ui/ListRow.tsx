import { Pressable, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { cn } from "@/utils/cn";
import { Text } from "./Text";

/**
 * ListRow (componentes.md §C.13).
 *
 * Linha de menu do Perfil (e outras telas): quadrado 32 com ícone
 * `bg-surface-3 rounded-md` à esquerda, label `body`, à direita valor
 * `body-sm fg-muted` (opcional) e `ChevronRight` quando há navegação.
 * Variante `danger` aplica `flame` ao texto e ícone.
 *
 * `min-h-14` (56 pt) garante a densidade confortável padrão; toque
 * mínimo de 44 pt vem do `minHeight` maior quando há `onPress`.
 */
type Props = {
  icon: LucideIcon;
  label: string;
  value?: string;
  onPress?: () => void;
  variant?: "default" | "danger";
  /** Quando true (default), `value` é exibido à direita; passe `false` para suprimir. */
  showChevron?: boolean;
  accessibilityHint?: string;
  className?: string;
};

export function ListRow({
  icon: Icon,
  label,
  value,
  onPress,
  variant = "default",
  showChevron = true,
  accessibilityHint,
  className,
}: Props) {
  const { c } = useTheme();
  const isDanger = variant === "danger";
  const tint = isDanger ? c("flame") : c("fg");
  const containerClass = onPress ? "active:bg-surface-3" : "";

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      disabled={!onPress}
      className={cn(
        "flex-row items-center px-4 gap-3 min-h-14",
        containerClass,
        className
      )}
    >
      <View
        className="rounded-md items-center justify-center bg-surface-3"
        style={{ width: 32, height: 32 }}
      >
        <Icon color={tint} size={18} strokeWidth={1.75} />
      </View>
      <Text
        variant="body"
        tone={isDanger ? "flame" : "fg"}
        className={cn("flex-1", isDanger && "font-sans-medium")}
        numberOfLines={1}
      >
        {label}
      </Text>
      {value ? (
        <Text variant="body-sm" tone="muted" numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {onPress && showChevron ? (
        <ChevronRight color={c("fg-subtle")} size={18} strokeWidth={1.75} />
      ) : null}
    </Pressable>
  );
}
