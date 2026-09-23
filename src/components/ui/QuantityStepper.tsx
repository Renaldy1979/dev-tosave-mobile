import { useRef } from "react";
import { Pressable, View } from "react-native";
import { Minus, Plus } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/theme/ThemeProvider";
import { cn } from "@/utils/cn";
import { Text } from "./Text";
import { duration } from "@/theme/motion";

/**
 * QuantityStepper (componentes.md §C.2).
 *
 * Botões `− n +` com `font-mono body`. Variantes:
 * - `glass`  → compacto h-8 (cards da Coleção); quadrado escuro.
 * - `secondary` → h-11 (CollectionPanel do detalhe), número 40 pt.
 *
 * Mín 1 (abaixo disso chama `onRemoveRequest`). Máx 99. Haptic
 * `selection` ao alternar; `accessibilityRole="adjustable"` com
 * `accessibilityActions increment/decrement`; valor lido como "X unidades".
 */
type Props = {
  value: number;
  onChange: (next: number) => void;
  onRemoveRequest?: () => void;
  variant?: "glass" | "secondary";
  className?: string;
};

const MIN = 1;
const MAX = 99;

function hitSlopFor(box: number) {
  const diff = Math.max(0, 44 - box);
  return { top: diff / 2, bottom: diff / 2, left: diff / 2, right: diff / 2 };
}

export function QuantityStepper({
  value,
  onChange,
  onRemoveRequest,
  variant = "glass",
  className,
}: Props) {
  const { c } = useTheme();
  const box = variant === "glass" ? 32 : 44;
  const iconSize = variant === "glass" ? 16 : 18;
  const numberWidth = variant === "glass" ? 26 : 40;
  const height = variant === "glass" ? 32 : 44;

  const isGlass = variant === "glass";

  const bump = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bump.value }],
  }));

  const animate = (dir: "up" | "down") => {
    bump.value = withSequence(
      withTiming(dir === "up" ? -2 : 2, { duration: duration.fast }),
      withTiming(0, { duration: duration.fast })
    );
  };

  const tryIncrement = () => {
    Haptics.selectionAsync().catch(() => undefined);
    animate("up");
    onChange(Math.min(MAX, value + 1));
  };

  const tryDecrement = () => {
    Haptics.selectionAsync().catch(() => undefined);
    animate("down");
    if (value <= MIN) {
      if (onRemoveRequest) onRemoveRequest();
      return;
    }
    onChange(Math.max(MIN, value - 1));
  };

  const ref = useRef<View>(null);

  return (
    <View
      ref={ref}
      accessibilityRole="adjustable"
      accessibilityValue={{ min: MIN, max: MAX, now: value }}
      accessibilityLabel={`${value} ${value === 1 ? "unidade" : "unidades"}. Deslize para cima ou para baixo para ajustar.`}
      accessibilityActions={[
        { name: "increment", label: "Aumentar" },
        { name: "decrement", label: "Diminuir" },
      ]}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === "increment") tryIncrement();
        if (event.nativeEvent.actionName === "decrement") tryDecrement();
      }}
      className={cn(
        "flex-row items-center rounded-sm",
        isGlass ? "bg-black/60" : "bg-surface-3",
        className
      )}
      style={{ height, gap: isGlass ? 4 : 6, paddingHorizontal: isGlass ? 4 : 6 }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Diminuir"
        hitSlop={hitSlopFor(box)}
        onPress={tryDecrement}
        disabled={false}
        className="items-center justify-center rounded-xs active:opacity-70"
        style={{ width: box, height: box }}
      >
        <Minus color={isGlass ? "#FFFFFF" : c("fg")} size={iconSize} strokeWidth={1.75} />
      </Pressable>
      <Animated.View
        style={[
          animatedStyle,
          { width: numberWidth, alignItems: "center", justifyContent: "center" },
        ]}
      >
        <Text
          variant={isGlass ? "body-sm" : "body"}
          tone={isGlass ? "ink" : "fg"}
          className="font-mono font-sans-semibold text-center"
        >
          {value}
        </Text>
      </Animated.View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Aumentar"
        hitSlop={hitSlopFor(box)}
        onPress={tryIncrement}
        disabled={value >= MAX}
        className="items-center justify-center rounded-xs active:opacity-70"
        style={{ width: box, height: box }}
      >
        <Plus
          color={isGlass ? "#FFFFFF" : c("fg")}
          size={iconSize}
          strokeWidth={1.75}
          opacity={value >= MAX ? 0.4 : 1}
        />
      </Pressable>
    </View>
  );
}
