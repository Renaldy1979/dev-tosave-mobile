import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useTheme } from "@/theme/ThemeProvider";
import { cn } from "@/utils/cn";

/**
 * Primitivos de skeleton. Pulso de opacidade 0.5 ↔ 1 em 1.4 s.
 * Movimento reduzido → opacidade estática em 0.7.
 */
type Common = { className?: string; style?: object };

function usePulse(target?: number) {
  const opacity = useSharedValue(0.5);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      opacity.value = withTiming(0.7, { duration: 0 });
      return () => cancelAnimation(opacity);
    }
    opacity.value = withRepeat(
      withTiming(target ?? 1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    return () => cancelAnimation(opacity);
  }, [opacity, reduced, target]);

  return useAnimatedStyle(() => ({ opacity: opacity.value }));
}

function SkeletonView({ className, style, children }: Common & { children?: React.ReactNode }) {
  const { c } = useTheme();
  const animatedStyle = usePulse();
  return (
    <Animated.View
      accessible={false}
      style={[animatedStyle, { backgroundColor: c("surface-3") }, style]}
      className={cn("rounded-md", className)}
    >
      {children}
    </Animated.View>
  );
}

function SkeletonRect({ className, style }: Common) {
  return <SkeletonView className={className} style={style} />;
}

function SkeletonCircle({ size, className }: { size: number; className?: string }) {
  return <SkeletonView className={className} style={{ width: size, height: size, borderRadius: size / 2 }} />;
}

function SkeletonText({ lines = 3, widths }: { lines?: number; widths?: number[] }) {
  const def = [100, 80, 60];
  return (
    <View accessible={false} className="gap-1.5">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonRect
          key={i}
          style={{ height: 12, width: `${widths?.[i] ?? def[i % def.length]}%` }}
        />
      ))}
    </View>
  );
}

export const Skeleton = {
  Rect: SkeletonRect,
  Circle: SkeletonCircle,
  Text: SkeletonText,
};
