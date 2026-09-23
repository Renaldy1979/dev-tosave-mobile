import { View } from "react-native";
import { Skeleton } from "../ui/Skeleton";

/**
 * Skeleton com a mesma geometria do CarCard `grid` para evitar
 * salto de layout quando o conteúdo chega.
 */
export function CarCardSkeleton() {
  return (
    <View className="rounded-lg bg-surface border border-border overflow-hidden">
      <Skeleton.Rect className="aspect-card rounded-none" />
      <View className="p-3 gap-1.5" style={{ minHeight: 76 }}>
        <Skeleton.Rect style={{ height: 10, width: "40%" }} />
        <Skeleton.Rect style={{ height: 12, width: "90%" }} />
        <Skeleton.Rect style={{ height: 10, width: "60%" }} />
      </View>
    </View>
  );
}

/**
 * Grade de 6 cards (3 linhas em celular) — preenche a primeira dobra
 * enquanto carrega. O `numColumns` é responsabilidade da tela.
 */
export function CarGridSkeleton({ numColumns = 2 }: { numColumns?: number }) {
  // 6 cards → 3 linhas de 2 colunas.
  const count = numColumns === 1 ? 4 : 6;
  return (
    <View className="flex-row flex-wrap gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={{ width: "48%" }}>
          <CarCardSkeleton />
        </View>
      ))}
    </View>
  );
}
