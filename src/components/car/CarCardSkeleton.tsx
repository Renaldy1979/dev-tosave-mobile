import { View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Skeleton } from "../ui/Skeleton";

/**
 * Skeleton com a mesma geometria do CarCard `grid` para evitar
 * salto de layout quando o conteúdo chega.
 */
export function CarCardSkeleton() {
  return (
    <View className="rounded-lg bg-surface border border-border overflow-hidden">
      <Skeleton.Rect className="aspect-card rounded-none" />
      <View className="p-3 gap-1.5" style={{ minHeight: 94 }}>
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

/**
 * Skeleton do detalhe do carro (componentes.md §11).
 * Galeria (aspect-gallery) + eyebrow + título 2 linhas + 3 badges +
 * bloco de 4 linhas. Não cobre a ActionBar (esqueleto separado lá).
 */
export function CarDetailSkeleton() {
  const { c } = useTheme();
  return (
    <View className="bg-bg">
      <Skeleton.Rect style={{ width: "100%", aspectRatio: 4 / 3 }} className="rounded-none" />
      <View className="px-4 pt-4 gap-3">
        <Skeleton.Rect style={{ width: "50%", height: 12 }} />
        <View className="gap-1.5">
          <Skeleton.Rect style={{ width: "90%", height: 22 }} />
          <Skeleton.Rect style={{ width: "60%", height: 22 }} />
        </View>
        <View className="flex-row gap-2 mt-1">
          <Skeleton.Rect style={{ width: 100, height: 24 }} />
          <Skeleton.Rect style={{ width: 60, height: 24 }} />
          <Skeleton.Rect style={{ width: 90, height: 24 }} />
        </View>
        <Skeleton.Rect style={{ width: "100%", height: 76, marginTop: 12 }} />
        <View className="gap-1.5 mt-2">
          <Skeleton.Rect style={{ width: "95%", height: 14 }} />
          <Skeleton.Rect style={{ width: "88%", height: 14 }} />
          <Skeleton.Rect style={{ width: "70%", height: 14 }} />
          <Skeleton.Rect style={{ width: "60%", height: 14 }} />
        </View>
      </View>
      {/* pequeno espaço extra ao final */}
      <View style={{ height: 24, backgroundColor: c("bg") }} />
    </View>
  );
}

/**
 * Skeleton do Perfil (componentes.md §11).
 * Círculo 88 (avatar) + 2 linhas (nome + e-mail) + 3 StatTiles.
 */
export function ProfileSkeleton() {
  return (
    <View className="items-center gap-3 mt-4 px-4">
      <Skeleton.Circle size={88} />
      <View className="gap-1.5 items-center mt-2">
        <Skeleton.Rect style={{ width: 160, height: 18 }} />
        <Skeleton.Rect style={{ width: 200, height: 14 }} />
      </View>
      <View
        className="rounded-lg bg-surface border border-border flex-row p-4 mt-4 gap-3 w-full"
        style={{ height: 84 }}
      >
        {[0, 1, 2].map((i) => (
          <View key={i} className="flex-1 items-center justify-center gap-1.5">
            <Skeleton.Rect style={{ width: 36, height: 22 }} />
            <Skeleton.Rect style={{ width: 56, height: 10 }} />
          </View>
        ))}
      </View>
    </View>
  );
}
