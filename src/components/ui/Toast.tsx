import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react-native";
import { Pressable, View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { cn } from "@/utils/cn";
import { duration, easing } from "@/theme/motion";
import { Text } from "./Text";

/**
 * Toast host único (componentes.md §C.3).
 *
 * `ToastProvider` deve ficar no root, acima das telas. O `useToast()`
 * expõe `show({ type, message, action?, durationMs? })` — máximo 1 visível
 * por vez (novo substitui o anterior). Posição: topo, `insets.top + 8`.
 *
 * `accessibilityLiveRegion="polite"` no RN propaga para leitor de tela;
 * o anúncio também pode ser disparado manualmente via
 * `AccessibilityInfo.announceForAccessibility` em uma evolução futura.
 */
export type ToastType = "success" | "danger" | "info";

export type ToastAction = { label: string; onPress: () => void };

export type ToastInput = {
  type?: ToastType;
  message: string;
  action?: ToastAction;
  /** Duração em ms; padrão 4000. Leitor de tela ativo: mínimo 8000. */
  durationMs?: number;
};

type InternalToast = ToastInput & { id: number; type: ToastType };

type ToastContextValue = {
  show: (toast: ToastInput) => void;
  hide: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast precisa estar dentro de <ToastProvider>.");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<InternalToast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counter = useRef(0);
  const offsetY = useSharedValue(-16);
  const opacity = useSharedValue(0);

  const hide = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    opacity.value = withTiming(0, { duration: duration.fast, easing: easing.out });
    offsetY.value = withTiming(-16, { duration: duration.fast, easing: easing.out }, (done) => {
      if (done) cancelAnimation(offsetY);
    });
    setTimeout(() => setCurrent(null), duration.fast + 20);
  }, [opacity, offsetY]);

  const show = useCallback(
    (toast: ToastInput) => {
      counter.current += 1;
      const id = counter.current;
      const type = toast.type ?? "info";
      const lifetime = toast.durationMs ?? 4000;
      // Limpa timer anterior; novo substitui o anterior.
      if (timer.current) clearTimeout(timer.current);
      setCurrent({ ...toast, type, id });
      opacity.value = withTiming(1, { duration: duration.base, easing: easing.out });
      offsetY.value = withTiming(0, { duration: duration.base, easing: easing.out });
      timer.current = setTimeout(() => {
        hide();
      }, lifetime);
    },
    [hide, opacity, offsetY]
  );

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ show, hide }), [show, hide]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastHost toast={current} opacity={opacity} offsetY={offsetY} />
    </ToastContext.Provider>
  );
}

function ToastHost({
  toast,
  opacity,
  offsetY,
}: {
  toast: InternalToast | null;
  opacity: SharedValue<number>;
  offsetY: SharedValue<number>;
}) {
  const insets = useSafeAreaInsets();
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: offsetY.value }],
  }));

  return (
    <View
      pointerEvents="box-none"
      style={{ position: "absolute", top: 0, left: 0, right: 0 }}
    >
      <Animated.View
        accessible
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        pointerEvents={toast ? "auto" : "none"}
        style={[animatedStyle, { marginTop: insets.top + 8, paddingHorizontal: 16 }]}
      >
        {toast ? (
          <ToastCard toast={toast} />
        ) : null}
      </Animated.View>
    </View>
  );
}

const ICONS = {
  success: CheckCircle2,
  danger: AlertCircle,
  info: Info,
} as const;

function ToastCard({ toast }: { toast: InternalToast }) {
  const { c } = useTheme();
  const Icon = ICONS[toast.type];
  const borderColor =
    toast.type === "success"
      ? c("success")
      : toast.type === "danger"
        ? c("danger")
        : c("info");
  const iconColor = borderColor;
  return (
    <View
      className={cn(
        "rounded-lg bg-surface border border-border flex-row items-center gap-2 px-3.5 py-3"
      )}
      style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}
    >
      <Icon color={iconColor} size={20} strokeWidth={1.75} />
      <Text variant="body-sm" className="flex-1 font-sans-medium">
        {toast.message}
      </Text>
      {toast.action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={toast.action.label}
          hitSlop={12}
          onPress={() => {
            toast.action?.onPress();
          }}
          className="px-2 py-1 active:opacity-70"
        >
          <Text variant="body-sm" tone="primary" className="font-sans-semibold">
            {toast.action.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
