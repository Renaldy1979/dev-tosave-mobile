import { useEffect } from "react";
import { Modal, Pressable, View } from "react-native";
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
 * RN `Modal` `transparent` `animationType="fade"` com
 * `statusBarTranslucent` e `navigationBarTranslucent`: cobre o app
 * inteiro, inclusive header, status bar e barra de navegação do
 * Android. Backdrop `ink` a 65% (cor explícita, igual nos dois temas),
 * envolvido em `ThemeScope`. Tocar no backdrop ou o back do Android =
 * `onClose` (Cancelar), exceto com uma ação em loading ou
 * `dismissable={false}`. Painel `rounded-xl bg-surface p-5` com entrada
 * escala 0.96 → 1.
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
  const scale = useSharedValue(0.96);

  // O fade (backdrop + painel) é do próprio Modal; aqui só a escala.
  useEffect(() => {
    scale.value = open
      ? withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) })
      : 0.96;
  }, [open, scale]);

  // Com uma ação em andamento, nem backdrop nem back do Android fecham.
  const canDismiss = dismissable && !actions.some((a) => a.loading);
  const requestClose = () => {
    if (canDismiss) onClose();
  };

  const sideBySide = actions.length === 2;
  const orderedActions = sideBySide ? [actions[1], actions[0]] : actions;

  const panelStyle = useAnimatedStyle(() => ({
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
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={requestClose}
    >
      {/* `flex-1`: sem ele o ThemeScope encolhe ao conteúdo e o fundo
          escuro e o painel ficavam presos no topo da tela. */}
      <ThemeScope scheme={scheme} className="flex-1">
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
            paddingHorizontal: 24,
            backgroundColor: c("ink", 0.65),
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancelar"
            onPress={requestClose}
            disabled={!canDismiss}
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
          />
          <Animated.View
            style={[panelStyle, { width: "100%", maxWidth: 400 }]}
            className="rounded-xl bg-surface border border-border p-5"
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
            {/* Ações com geometria explícita (sem depender de `gap` via
                className): 2 ações lado a lado — a secundária à esquerda,
                a principal à direita —; 3 ou mais, empilhadas. Cada botão
                tem no mínimo 44 pt e 12 pt de espaço, sem área de toque
                sobreposta. */}
            <View
              style={{
                marginTop: 20,
                flexDirection: sideBySide ? "row" : "column",
                gap: 12,
              }}
            >
              {orderedActions.map((action, idx) => (
                <View
                  key={`${action.label}-${idx}`}
                  style={sideBySide ? { flex: 1 } : undefined}
                >
                  <Button
                    label={action.label}
                    variant={action.variant ?? "primary"}
                    size="md"
                    fullWidth
                    loading={action.loading}
                    disabled={action.disabled}
                    onPress={action.onPress}
                  />
                </View>
              ))}
            </View>
          </Animated.View>
        </View>
      </ThemeScope>
    </Modal>
  );
}
