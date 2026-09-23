import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Espelha `AccessibilityInfo.isReduceMotionEnabled()` para o estado do
 * React. Quando o usuário tem movimento reduzido nas preferências do
 * sistema, removemos escalas/pops e mantemos só fades curtos.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduced(value);
    });
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled: boolean) => {
        if (mounted) setReduced(enabled);
      }
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduced;
}
