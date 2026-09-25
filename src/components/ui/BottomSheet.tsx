import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, Pressable, View, useWindowDimensions } from "react-native";
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
  /**
   * "dynamic" → altura do conteúdo, medida por `onLayout` (não usa o
   * `enableDynamicSizing` do @gorhom, que no build nativo mediu 0 e o
   * sheet não aparecia). Padrão `["55%", "90%"]`.
   */
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

  // Modo "dynamic": altura medida do conteúdo + alça (≈ 28 pt), limitada
  // à tela. Até a primeira medida, abre em 50%.
  const { height: screenHeight } = useWindowDimensions();
  const [contentHeight, setContentHeight] = useState(0);
  const dynamicSnapPoints = useMemo<(string | number)[]>(() => {
    if (contentHeight <= 0) return ["50%"];
    return [Math.min(contentHeight + 28, screenHeight - insets.top - 16)];
  }, [contentHeight, screenHeight, insets.top]);

  // Abre/fecha de acordo com `open`. `dismiss()` só com o sheet
  // apresentado: chamado com o modal fechado (na montagem, ou depois de
  // fechar pelo gesto/backdrop), o @gorhom fica em DISMISSING e o
  // `present()` seguinte não renderiza nada.
  const presented = useRef(false);
  useEffect(() => {
    if (open) {
      presented.current = true;
      ref.current?.present();
    } else if (presented.current) {
      presented.current = false;
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

  // O modal já fechou (gesto, backdrop ou `dismiss()`): só avisa o pai.
  const handleModalDismiss = useCallback(() => {
    presented.current = false;
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
      snapPoints={isDynamic ? dynamicSnapPoints : resolvedSnapPoints}
      enableDynamicSizing={false}
      onDismiss={handleModalDismiss}
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
      {/* Fixo: `flex-1` (sem ele o ThemeScope encolhe e o conteúdo some).
          Dinâmico: altura do conteúdo, medida por `onLayout`. */}
      <ThemeScope scheme={scheme} className={isDynamic ? undefined : "flex-1"}>
        {isDynamic ? (
          <BottomSheetView
            onLayout={(e) => {
              const h = Math.ceil(e.nativeEvent.layout.height);
              if (h > 0 && Math.abs(h - contentHeight) > 1) setContentHeight(h);
            }}
          >
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
