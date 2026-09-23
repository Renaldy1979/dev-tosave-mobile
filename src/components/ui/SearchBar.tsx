import { Pressable, TextInput, View } from "react-native";
import { Search, X } from "lucide-react-native";
import type { ReactNode } from "react";
import { useTheme } from "@/theme/ThemeProvider";
import { cn } from "@/utils/cn";
import { IconButton } from "./IconButton";

/**
 * Barra de busca (`componentes.md §3`).
 *
 * - `mode: "input"` — campo editável com botão "X" para limpar.
 * - `mode: "trigger"` — apenas navega (Home), não editável.
 *
 * `surface: "ink"` aplica o visual para superfícies escuras (topo da
 * Home, modal de login, etc.).
 */
type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  mode?: "input" | "trigger";
  onPressTrigger?: () => void;
  autoFocus?: boolean;
  rightAction?: ReactNode;
  surface?: "default" | "ink";
  className?: string;
};

export function SearchBar({
  value,
  onChangeText,
  onSubmit,
  placeholder = "Buscar por nome ou código",
  mode = "input",
  onPressTrigger,
  autoFocus = false,
  rightAction,
  surface = "default",
  className,
}: Props) {
  const { c } = useTheme();

  const containerClass =
    surface === "ink"
      ? "bg-white/10 border-white/10"
      : "bg-surface-2 border-border";

  const iconColor = surface === "ink" ? "#FFFFFFCC" : c("fg-subtle");
  const textClass = surface === "ink" ? "text-ink-fg" : "text-fg";

  if (mode === "trigger") {
    return (
      <Pressable
        accessibilityRole="search"
        accessibilityLabel="Buscar miniaturas"
        onPress={onPressTrigger}
        className={cn(
          "flex-row items-center rounded-md px-3 gap-2 border",
          containerClass,
          className
        )}
        style={{ height: 44 }}
      >
        <Search color={iconColor} size={18} strokeWidth={1.75} />
        <Pressable
          accessibilityRole="text"
          className={cn("flex-1 font-sans text-body", textClass, "opacity-80")}
        >
          {placeholder}
        </Pressable>
      </Pressable>
    );
  }

  return (
    <View
      className={cn(
        "flex-row items-center rounded-md px-3 gap-2 border",
        containerClass,
        className
      )}
      style={{ height: 44 }}
    >
      <Search color={iconColor} size={18} strokeWidth={1.75} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor={c("fg-subtle")}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        autoFocus={autoFocus}
        className={cn("flex-1 font-sans text-body", textClass)}
        style={{ paddingVertical: 0 }}
      />
      {value.length > 0 ? (
        <IconButton
          icon={X}
          variant="ghost"
          size="sm"
          accessibilityLabel="Limpar busca"
          onPress={() => onChangeText("")}
        />
      ) : null}
      {rightAction}
    </View>
  );
}
