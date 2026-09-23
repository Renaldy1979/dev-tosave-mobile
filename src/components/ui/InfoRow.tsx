import { Pressable, View } from "react-native";
import { ChevronRight, Copy } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import * as Clipboard from "expo-clipboard";
import { useTheme } from "@/theme/ThemeProvider";
import { cn } from "@/utils/cn";
import { Text } from "./Text";
import { useToast } from "./Toast";

/**
 * InfoRow (componentes.md §C.11).
 *
 * Linha de atributo do detalhe: ícone 18 `fg-subtle` + label
 * `body-sm fg-muted` à esquerda, valor `body fg` (ou `font-mono`) à
 * direita, `min-h-12`, divisória hairline `border`.
 *
 * `onPress` torna a linha tocável. `copyable` copia o valor via
 * expo-clipboard + Toast "Código copiado." e marca a área como
 * `accessibilityActions` "Copiar".
 */
type Props = {
  icon: LucideIcon;
  label: string;
  value?: string;
  mono?: boolean;
  copyable?: boolean;
  navigate?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  className?: string;
  /** Conteúdo custom à direita (no lugar de `value`). */
  children?: React.ReactNode;
};

export function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
  copyable,
  navigate,
  onPress,
  accessibilityLabel,
  className,
  children,
}: Props) {
  const { c } = useTheme();
  const { show } = useToast();
  const tappable = Boolean(onPress);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await Clipboard.setStringAsync(value);
      show({ type: "success", message: "Código copiado." });
    } catch {
      show({ type: "danger", message: "Não foi possível copiar." });
    }
  };

  const handlePress = () => {
    if (copyable && !navigate) {
      void handleCopy();
      return;
    }
    if (onPress) onPress();
  };

  const Container = tappable ? Pressable : View;
  const RightAdornment = (() => {
    if (copyable) return Copy;
    if (navigate) return ChevronRight;
    return null;
  })();

  const a11y =
    accessibilityLabel ??
    (value
      ? copyable
        ? `${label}, ${value}. Toque duas vezes para copiar.`
        : `${label}, ${value}`
      : label);

  return (
    <Container
      accessibilityRole={tappable ? "button" : "text"}
      accessibilityLabel={a11y}
      onPress={tappable ? handlePress : undefined}
      className={cn(
        "flex-row items-center min-h-12 px-4 border-b border-border gap-3",
        tappable && "active:bg-surface-3",
        className
      )}
    >
      <Icon color={c("fg-subtle")} size={18} strokeWidth={1.75} />
      <Text variant="body-sm" tone="muted" className="flex-1">
        {label}
      </Text>
      {children ? (
        children
      ) : value ? (
        <Text
          variant="body"
          className={cn(mono ? "font-mono" : "font-sans")}
          numberOfLines={1}
        >
          {value}
        </Text>
      ) : null}
      {RightAdornment && !children ? (
        <RightAdornment
          color={c("fg-subtle")}
          size={copyable ? 14 : 16}
          strokeWidth={1.75}
        />
      ) : null}
    </Container>
  );
}
