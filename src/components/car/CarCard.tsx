import { Pressable, View } from "react-native";
import { Image } from "expo-image";
import { Car } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { cn } from "@/utils/cn";
import { Text } from "../ui/Text";
import { Badge } from "../ui/Badge";
import { FavoriteButton } from "./FavoriteButton";
import { QuantityStepper } from "../ui/QuantityStepper";
import type { CarListItem } from "@/types";

/**
 * CarCard (`componentes.md §4`).
 *
 * Variantes:
 * - `grid`       → 2 colunas na Home/Busca. Imagem dominante, eyebrow
 *                  "MARCA · ANO", título (2 linhas), caption da série,
 *                  coração no canto superior direito.
 * - `row`        → linha horizontal com thumb à esquerda + texto +
 *                  coração.
 * - `collection` → mesmo grid, mas com `QuantityStepper glass` no
 *                  canto e badge "Repetido ×N" quando `quantity > 1`.
 *                  A subtração da última unidade abre
 *                  `onRemoveRequest`.
 *
 * Dados vêm por prop (`car: CarListItem`) — o componente não conhece
 * os services.
 */
type Props = {
  car: CarListItem;
  variant?: "grid" | "row" | "collection";
  inCollection?: boolean;
  quantity?: number;
  onPress: () => void;
  onToggleCollection?: () => void;
  onChangeQuantity?: (next: number) => void;
  onRemoveRequest?: () => void;
  accessibilityHint?: string;
};

export function CarCard({
  car,
  variant = "grid",
  inCollection = false,
  quantity = 0,
  onPress,
  onToggleCollection,
  onChangeQuantity,
  onRemoveRequest,
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

  // ----- grid + collection variants -----
  const isCollection = variant === "collection";
  const a11yLabel = `${car.title}, ${car.brandName}, ${car.year}, número ${car.collector}${
    inCollection ? `, ${quantity} ${quantity === 1 ? "unidade" : "unidades"} na sua coleção` : ""
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
        {/* favorite / stepper — canto superior direito */}
        <View className="absolute top-2 right-2">
          {isCollection && onChangeQuantity ? (
            <QuantityStepper
              value={quantity}
              variant="glass"
              onChange={onChangeQuantity}
              onRemoveRequest={onRemoveRequest}
            />
          ) : onToggleCollection ? (
            <FavoriteButton
              active={inCollection}
              onToggle={onToggleCollection}
              variant="glass"
              size="sm"
            />
          ) : null}
        </View>
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
        {isCollection && quantity > 1 ? (
          <Text variant="caption" tone="flame" className="font-sans-semibold mt-0.5">
            Repetido ×{quantity}
          </Text>
        ) : (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {car.serieTitle}
          </Text>
        )}
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
