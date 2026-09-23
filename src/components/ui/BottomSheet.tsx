import { useCallback, useEffect, useMemo, useRef } from "react";
import { BackHandler, Pressable, View } from "react-native";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { ThemeScope } from "./ThemeScope";
import { Text } from "./Text";
import { IconButton } from "./IconButton";

/**
 * BottomSheet (componentes.md §8).
 *
 * Wrapper do `@gorhom/bottom-sheet` v5. Garante:
 * - `ThemeScope` em volta (portal perde o tema).
 * - Backdrop `overlay/70`, fecha no toque.
 * - Alça 36×4 `fg-subtle/40`.
 * - Header do sheet com título h3 + X à direita.
 * - Footer fixo (slot) com `bg-surface border-t` e `paddingBottom` correto.
 * - Back do Android fecha o sheet.
 */
type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** "dynamic" → `enableDynamicSizing`. Padrão `["55%", "90%"]`. */
  snapPoints?: (string | number)[] | "dynamic";
  footer?: React.ReactNode;
  /** `true` envolve o conteúdo em BottomSheetScrollView. */
  scrollable?: boolean;
  children: React.ReactNode;
};

export function BottomSheet({
  open,
  onClose,
  title,
  snapPoints,
  footer,
  scrollable = true,
  children,
}: Props) {
  const ref = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  const { c, scheme } = useTheme();

  const resolvedSnapPoints = useMemo<(string | number)[]>(() => {
    if (snapPoints === "dynamic") return [];
    if (snapPoints && snapPoints.length > 0) return snapPoints;
    return ["55%", "90%"];
  }, [snapPoints]);

  const isDynamic = snapPoints === "dynamic";

  // Abre/fecha de acordo com `open`.
  useEffect(() => {
    if (open) {
      ref.current?.present();
    } else {
      ref.current?.dismiss();
    }
  }, [open]);

  // Back do Android fecha o sheet.
  useEffect(() => {
    if (!open) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [open, onClose]);

  const handleDismiss = useCallback(() => {
    onClose();
  }, [onClose]);

  const renderBackdrop = (props: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop
      {...props}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      opacity={0.7}
      pressBehavior="close"
    />
  );

  const header = title ? (
    <View className="flex-row items-center justify-between px-5 pb-3 border-b border-border">
      <Text variant="h3" numberOfLines={1}>
        {title}
      </Text>
      <IconButton
        icon={X}
        variant="ghost"
        size="md"
        accessibilityLabel="Fechar"
        onPress={handleDismiss}
      />
    </View>
  ) : null;

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={isDynamic ? undefined : resolvedSnapPoints}
      enableDynamicSizing={isDynamic}
      onDismiss={handleDismiss}
      handleIndicatorStyle={{
        backgroundColor: c("fg-subtle"),
        opacity: 0.4,
        width: 36,
        height: 4,
      }}
      backgroundStyle={{ backgroundColor: c("surface") }}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      topInset={insets.top}
      keyboardBehavior="interactive"
      android_keyboardInputMode="adjustResize"
    >
      <ThemeScope scheme={scheme}>
        {/* `flex: 1` quebra o modo `dynamic` do @gorhom. */}
        {isDynamic ? (
          <BottomSheetView>
            {header}
            {children}
            {footer ? (
              <View
                className="px-5 pt-3 bg-surface border-t border-border"
                style={{ paddingBottom: Math.max(insets.bottom, 12) }}
              >
                {footer}
              </View>
            ) : null}
          </BottomSheetView>
        ) : (
          <BottomSheetView style={{ flex: 1 }}>
            {header}
            {scrollable ? (
              <BottomSheetScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: footer ? 16 : 24 }}
              >
                {children}
              </BottomSheetScrollView>
            ) : (
              <View className="flex-1 px-5 py-3">{children}</View>
            )}
            {footer ? (
              <View
                className="px-5 pt-3 bg-surface border-t border-border"
                style={{ paddingBottom: Math.max(insets.bottom, 12) }}
              >
                {footer}
              </View>
            ) : null}
          </BottomSheetView>
        )}
      </ThemeScope>
    </BottomSheetModal>
  );
}

// Reexporta o TextInput do sheet para quem precisar.
export const SheetInput = BottomSheetTextInput;

// Pressable fantasma para conteúdo com onPress dentro do sheet
// (algumas implementações precisam wrapear para o Pressable
// responder dentro do BottomSheetModal — manter para reuso).
export function SheetPressable({
  onPress,
  children,
  className,
  accessibilityLabel,
}: {
  onPress: () => void;
  children: React.ReactNode;
  className?: string;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      className={className}
    >
      {children}
    </Pressable>
  );
}
