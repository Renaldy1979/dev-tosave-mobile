import { View } from "react-native";
import { cn } from "@/utils/cn";

/**
 * ProgressBar (`10-series.md` §B.3): trilho de 6 pt `surface-3`,
 * preenchimento `primary` com largura X/N; em 100%, `accent`. Sem
 * animação — a largura é aplicada direto.
 */
type Props = {
  value: number;
  max: number;
  /** Rótulo lido pelo leitor de tela (padrão "{X} de {N}"). */
  accessibilityLabel?: string;
  className?: string;
};

export function ProgressBar({ value, max, accessibilityLabel, className }: Props) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const complete = max > 0 && value >= max;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? `${value} de ${max}`}
      accessibilityValue={{ min: 0, max, now: Math.min(value, max) }}
      className={cn("h-1.5 rounded-full bg-surface-3 overflow-hidden", className)}
    >
      <View
        className={cn("h-full rounded-full", complete ? "bg-accent" : "bg-primary")}
        style={{ width: `${ratio * 100}%` }}
      />
    </View>
  );
}

/** Percentual inteiro para exibição ("67%"). */
export function percentLabel(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.round((Math.min(value, max) / max) * 100);
}
