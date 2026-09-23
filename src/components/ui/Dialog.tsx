import { useEffect } from "react";
import { BackHandler, Modal, Pressable, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { LucideIcon } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { ThemeScope } from "./ThemeScope";
import { Text } from "./Text";
import { Button } from "./Button";

/**
 * Dialog centralizado (componentes.md §9.1).
 *
 * RN `Modal` `transparent` `animationType="fade"` + `statusBarTranslucent`,
 * envolvido em `ThemeScope`. Backdrop `overlay/70`, toque fora fecha
 * (exceto em loading). Painel `rounded-xl bg-surface p-5` com entrada
 * escala 0.96 → 1 + fade (200 ms).
 */
type Action = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  loading?: boolean;
  disabled?: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconTone?: "flame" | "danger" | "primary";
  actions?: Action[];
  /** Quando true, toque fora não fecha (usado em loading). */
  dismissable?: boolean;
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  icon: Icon,
  iconTone = "primary",
  actions = [],
  dismissable = true,
}: Props) {
  const insets = useSafeAreaInsets();
  const { c, scheme } = useTheme();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.96);

  useEffect(() => {
    if (open) {
      opacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
      scale.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) });
    } else {
      opacity.value = withTiming(0, { duration: 160 });
      scale.value = withTiming(0.96, { duration: 160 });
    }
  }, [open, opacity, scale]);

  // Back do Android
  useEffect(() => {
    if (!open || !dismissable) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [open, dismissable, onClose]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const panelStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const iconBg = iconTone === "flame" || iconTone === "danger"
    ? c("flame-soft")
    : c("primary-soft");
  const iconColor = iconTone === "flame" || iconTone === "danger"
    ? c("flame")
    : c("primary-text");

  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismissable ? onClose : undefined}
    >
      <ThemeScope scheme={scheme}>
        <View
          style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
          className="flex-1 items-center justify-center bg-overlay/70"
        >
          <Animated.View style={[backdropStyle, { position: "absolute", inset: 0 }]} pointerEvents="none" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fechar diálogo"
            onPress={dismissable ? onClose : undefined}
            disabled={!dismissable}
            style={{ position: "absolute", inset: 0 }}
          />
          <Animated.View
            style={panelStyle}
            className="mx-6 w-full max-w-[400px] rounded-xl bg-surface border border-border p-5"
          >
            {Icon ? (
              <View
                className="rounded-full items-center justify-center mb-3 self-center"
                style={{ width: 48, height: 48, backgroundColor: iconBg }}
              >
                <Icon color={iconColor} size={24} strokeWidth={1.75} />
              </View>
            ) : null}
            <Text variant="h3" className="text-center">
              {title}
            </Text>
            {description ? (
              <Text variant="body" tone="muted" className="text-center mt-2">
                {description}
              </Text>
            ) : null}
            <View className="gap-2 mt-5">
              {actions.map((action, idx) => (
                <Button
                  key={`${action.label}-${idx}`}
                  label={action.label}
                  variant={action.variant ?? "primary"}
                  size="md"
                  fullWidth
                  loading={action.loading}
                  disabled={action.disabled}
                  onPress={action.onPress}
                />
              ))}
            </View>
          </Animated.View>
        </View>
      </ThemeScope>
    </Modal>
  );
}
