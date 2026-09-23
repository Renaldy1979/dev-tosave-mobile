import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { AccessibilityInfo, TextInput, View } from "react-native";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import type { LucideIcon } from "lucide-react-native";
import { AlertCircle, Eye, EyeOff } from "lucide-react-native";
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
 * Repassa `ref` para o `TextInput` interno (focus/blur imperativos).
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
  /** Quando dentro de um BottomSheet do @gorhom, usar `BottomSheetTextInput`
   *  para o teclado não cobrir os campos (item 29 da revisão). */
  as?: "default" | "sheet";
} & Omit<TextInputProps, "style">;

export const Input = forwardRef<TextInput, Props>(function Input(
  {
    label,
    hint,
    error,
    leftIcon: LeftIcon,
    rightSlot,
    variant = "default",
    className,
    as = "default",
    onFocus,
    onBlur,
    secureTextEntry,
    ...rest
  },
  ref
) {
  const { c } = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const inputRef = useRef<TextInput>(null);
  useImperativeHandle(ref, () => inputRef.current as TextInput);

  const isPassword = variant === "password";
  const isMono = variant === "mono";
  const actuallySecure = isPassword && !revealed;

  // Borda muda no foco (primary) e no erro (danger).
  const borderClass = error
    ? "border-danger"
    : focused
      ? "border-primary"
      : "border-border-strong";

  // Anel de foco primary/15 (3 pt) sem layout shift.
  const focusRing = focused && !error;

  return (
    <View className={cn("w-full", className)}>
      <Text variant="body-sm" className="mb-1.5 font-sans-medium">
        {label}
      </Text>
      <View
        className={cn(
          "rounded-md bg-surface-2 border px-3.5",
          focusRing ? "border-primary" : borderClass
        )}
        style={{ minHeight: 48, position: "relative", justifyContent: "center" }}
      >
        {/* Anel externo quando focado (primary/15). */}
        {focusRing ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: -3,
              left: -3,
              right: -3,
              bottom: -3,
              borderRadius: 10,
              borderWidth: 3,
              borderColor: c("primary", 0.15),
            }}
          />
        ) : null}
        <View className="flex-row items-center">
          {LeftIcon ? (
            <View className="mr-2">
              <LeftIcon color={c("fg-subtle")} size={18} strokeWidth={1.75} />
            </View>
          ) : null}
          {(() => {
            const InputComponent: typeof TextInput = as === "sheet" ? (BottomSheetTextInput as unknown as typeof TextInput) : TextInput;
            return (
          <InputComponent
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
            );
          })()}
          {isPassword ? (
            <IconButton
              icon={revealed ? EyeOff : Eye}
              variant="ghost"
              size="sm"
              accessibilityLabel={revealed ? "Ocultar senha" : "Mostrar senha"}
              onPress={() => setRevealed((prev) => !prev)}
            />
          ) : error ? (
            <AlertCircle color={c("danger")} size={18} strokeWidth={1.75} />
          ) : rightSlot ? (
            rightSlot
          ) : null}
        </View>
      </View>
      {error ? (
        <Text
          variant="caption"
          tone="danger"
          className="mt-1.5"
          accessibilityLiveRegion="polite"
          onLayout={() => {
            // Anuncia o erro para o leitor de tela.
            void AccessibilityInfo.announceForAccessibility(error);
          }}
        >
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="muted" className="mt-1.5">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});
