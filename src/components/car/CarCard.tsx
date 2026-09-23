import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { Car } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { cn } from "@/utils/cn";
import { Text } from "../ui/Text";
import { Badge } from "../ui/Badge";
import { FavoriteButton } from "./FavoriteButton";
import type { CarListItem } from "@/types";

/**
 * CarCard (`componentes.md §4`).
 *
 * Variantes:
 * - `grid` → 2 colunas na Home/Busca. Imagem dominante, eyebrow
 *   "MARCA · ANO", título (2 linhas), caption da série, coração no
 *   canto superior direito.
 * - `row` → linha horizontal com thumb à esquerda + texto + coração.
 *
 * Dados vêm por prop (`car: CarListItem`) — o componente não conhece
 * os services.
 */
type Props = {
  car: CarListItem;
  variant?: "grid" | "row";
  inCollection?: boolean;
  onPress: () => void;
  onToggleCollection?: () => void;
  accessibilityHint?: string;
};

export function CarCard({
  car,
  variant = "grid",
  inCollection = false,
  onPress,
  onToggleCollection,
  accessibilityHint = "Abre os detalhes",
}: Props) {
  const { c } = useTheme();

  if (variant === "row") {
    return (
      <View className="flex-row items-center gap-3">
        <CarStage uri={car.imagemThumb} className="rounded-md overflow-hidden" />
        <View className="flex-1 min-w-0">
          <Text variant="eyebrow" tone="subtle" numberOfLines={1}>
            {car.brandName.toUpperCase()} · {car.year}
          </Text>
          <Text variant="body-sm" className="font-sans-semibold mt-0.5" numberOfLines={2}>
            {car.title}
          </Text>
          <Text variant="caption" tone="muted" className="font-mono mt-0.5">
            {car.toy}
          </Text>
        </View>
        {onToggleCollection ? (
          <FavoriteButton
            active={inCollection}
            onToggle={onToggleCollection}
            variant="solid"
            size="sm"
          />
        ) : null}
      </View>
    );
  }

  // ----- grid variant -----
  const a11yLabel = `${car.title}, ${car.brandName}, ${car.year}, número ${car.collector}${
    inCollection ? ", na sua coleção" : ""
  }`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected: inCollection }}
      onPress={onPress}
      className={cn(
        "rounded-lg bg-surface border border-border overflow-hidden active:bg-surface-3"
      )}
      style={{ elevation: 0 }}
    >
      <View className="relative">
        <CarStage uri={car.imagemThumb} className="aspect-card" />
        {/* collector badge accent — canto superior esquerdo */}
        <View className="absolute top-2 left-2">
          <Badge variant="accent" size="sm">
            #{car.collector}
          </Badge>
        </View>
        {/* favorite — canto superior direito */}
        {onToggleCollection ? (
          <View className="absolute top-2 right-2">
            <FavoriteButton
              active={inCollection}
              onToggle={onToggleCollection}
              variant="glass"
              size="sm"
            />
          </View>
        ) : null}
        {/* serie position — canto inferior direito */}
        {car.seriePosition ? (
          <View className="absolute bottom-2 right-2">
            <Badge variant="glass" size="sm">
              {car.seriePosition}
            </Badge>
          </View>
        ) : null}
      </View>
      {/* corpo do card — altura fixa 76 pt para alinhar grid */}
      <View className="p-3 gap-0.5" style={{ minHeight: 76 }}>
        <Text variant="eyebrow" tone="subtle" numberOfLines={1}>
          {car.brandName.toUpperCase()} · {car.year}
        </Text>
        <Text variant="body-sm" className="font-sans-semibold" numberOfLines={2}>
          {car.title}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1}>
          {car.serieTitle}
        </Text>
      </View>
    </Pressable>
  );
}

/**
 * Palco da imagem com `expo-image` (cache em disco, transição
 * suave) e ícone `Car` de fallback quando a imagem falha ou não há.
 */
function CarStage({ uri, className }: { uri: string | null | undefined; className?: string }) {
  const { c } = useTheme();
  if (!uri) {
    return (
      <View
        className={cn("aspect-card bg-surface-2 items-center justify-center", className)}
      >
        <Car color={c("fg-subtle")} size={40} strokeWidth={1.75} opacity={0.4} />
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      recyclingKey={uri}
      contentFit="cover"
      transition={200}
      className={cn("aspect-card bg-surface-2", className)}
    />
  );
}
