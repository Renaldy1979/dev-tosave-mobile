import { useEffect, useState } from "react";
import { LayoutChangeEvent, Pressable, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { cn } from "@/utils/cn";
import { Text } from "./Text";
import type { LucideIcon } from "lucide-react-native";

/**
 * Segmentado (componentes.md §C.5).
 *
 * Container `bg-surface-2 rounded-md p-1 h-11`, itens `flex-1` com
 * fundo `bg-surface-3 border border-border` no selecionado. O fundo é
 * posicionado em absoluto e animado por `left` (medindo a largura do
 * container em `onLayout`).
 *
 * Tema do Perfil usa três opções; é reaproveitado em outras telas.
 *
 * `accessibilityRole="radiogroup"` no container e `"radio"` em cada
 * item; `accessibilityState.selected` marca o ativo.
 */
type Option<T extends string> = {
  value: T;
  label: string;
  icon?: LucideIcon;
};

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (next: T) => void;
  accessibilityLabel?: string;
  className?: string;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  className,
}: Props<T>) {
  const { c } = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const itemWidth = containerWidth > 0 ? (containerWidth - 8) / options.length : 0;
  const targetLeft = 4 + index * itemWidth;

  const [animatedLeft, setAnimatedLeft] = useState(targetLeft);

  useEffect(() => {
    // Animação leve usando requestAnimationFrame.
    let frame: number;
    const start = animatedLeft;
    const end = targetLeft;
    if (Math.abs(end - start) < 0.5) {
      setAnimatedLeft(end);
      return;
    }
    const duration = 200;
    const t0 = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - t0) / duration);
      // ease-in-out cubic
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      setAnimatedLeft(start + (end - start) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetLeft, itemWidth]);

  const onLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      className={cn("flex-row bg-surface-2 rounded-md p-1 h-12 relative", className)}
      onLayout={onLayout}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 4,
          height: 48 - 8,
          left: animatedLeft,
          width: itemWidth,
          borderRadius: 6,
          backgroundColor: c("surface-3"),
          borderWidth: 1,
          borderColor: c("border"),
        }}
      />
      {options.map((option, idx) => {
        const active = option.value === value;
        const Icon = option.icon;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${option.label}${active ? ", selecionado" : ""}, ${idx + 1} de ${options.length}`}
            onPress={() => onChange(option.value)}
            className="flex-1 flex-row items-center justify-center gap-1.5 rounded-md active:opacity-80 min-h-12"
          >
            {Icon ? (
              <Icon
                color={active ? c("fg") : c("fg-muted")}
                size={16}
                strokeWidth={1.75}
              />
            ) : null}
            <Text
              variant="body-sm"
              tone={active ? "fg" : "muted"}
              className={active ? "font-sans-semibold" : "font-sans-medium"}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
