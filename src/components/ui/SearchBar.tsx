import { forwardRef, useImperativeHandle, useRef } from "react";
import { Pressable, TextInput, View } from "react-native";
import { Search, X } from "lucide-react-native";
import type { ReactNode } from "react";
import { useTheme } from "@/theme/ThemeProvider";
import { cn } from "@/utils/cn";
import { IconButton } from "./IconButton";
import { Text } from "./Text";

/**
 * Barra de busca (`componentes.md §3`).
 *
 * - `mode: "input"` — campo editável com botão "X" para limpar.
 * - `mode: "trigger"` — apenas navega (Home), não editável.
 *
 * `surface: "ink"` aplica o visual para superfícies escuras (topo da
 * Home, modal de login, etc.).
 *
 * Repassa `ref` para o `TextInput` interno via `focus()` /
 * `blur()` imperativos — usado pela Busca quando o usuário chega
 * com `focus=1` e a tab já está montada.
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

export const SearchBar = forwardRef<TextInput, Props>(function SearchBar(
  {
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
  },
  ref
) {
  const { c } = useTheme();
  const inputRef = useRef<TextInput>(null);
  useImperativeHandle(ref, () => inputRef.current as TextInput);

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
        <Text
          variant="body"
          className={cn("flex-1 font-sans opacity-80", textClass)}
          numberOfLines={1}
        >
          {placeholder}
        </Text>
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
        ref={inputRef}
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
});
