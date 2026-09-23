import { useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { Eye, EyeOff } from "lucide-react-native";
import type { TextInputProps } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { cn } from "@/utils/cn";
import { Text } from "./Text";
import { IconButton } from "./IconButton";

/**
 * Campo de texto com label, hint, error, ícone esquerdo e slot à
 * direita (`componentes.md §2`). Variante `password` traz o toggle
 * de mostrar/ocultar. Variante `mono` força fonte monoespaçada para
 * códigos.
 *
 * Sobre ink (login): herda `text-ink-fg` quando usado em `ThemeScope dark`.
 * Aqui mantemos as classes semânticas (`fg`, `fg-muted`, etc.) — o ink
 * resolve pelo `ThemeScope`.
 */
type Props = {
  label: string;
  hint?: string;
  error?: string;
  leftIcon?: LucideIcon;
  rightSlot?: React.ReactNode;
  variant?: "default" | "password" | "mono";
  className?: string;
} & Omit<TextInputProps, "style">;

export function Input({
  label,
  hint,
  error,
  leftIcon: LeftIcon,
  rightSlot,
  variant = "default",
  className,
  onFocus,
  onBlur,
  secureTextEntry,
  ...rest
}: Props) {
  const { c } = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const isPassword = variant === "password";
  const isMono = variant === "mono";
  const actuallySecure = isPassword && !revealed;

  // Borda muda no foco (primary) e no erro (danger).
  const borderClass = error
    ? "border-danger"
    : focused
      ? "border-primary"
      : "border-border-strong";

  return (
    <View className={cn("w-full", className)}>
      <Text variant="body-sm" className="mb-1.5 font-sans-medium">
        {label}
      </Text>
      <View
        className={cn(
          "flex-row items-center rounded-md bg-surface-2 border px-3.5",
          borderClass
        )}
        style={{ minHeight: 48 }}
      >
        {LeftIcon ? (
          <View className="mr-2">
            <LeftIcon color={c("fg-subtle")} size={18} strokeWidth={1.75} />
          </View>
        ) : null}
        <TextInput
          ref={inputRef}
          {...rest}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          secureTextEntry={actuallySecure}
          placeholderTextColor={c("fg-subtle")}
          selectionColor={c("primary")}
          className={cn(
            "flex-1 py-2.5 text-body text-fg",
            LeftIcon ? "pl-1" : "pl-0",
            isMono && "font-mono"
          )}
        />
        {isPassword ? (
          <IconButton
            icon={revealed ? EyeOff : Eye}
            variant="ghost"
            size="sm"
            accessibilityLabel={revealed ? "Ocultar senha" : "Mostrar senha"}
            onPress={() => setRevealed((prev) => !prev)}
          />
        ) : rightSlot ? (
          rightSlot
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" tone="danger" className="mt-1.5">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="muted" className="mt-1.5">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
