import { Pressable, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { cn } from "@/utils/cn";
import { Text } from "../ui/Text";
import { Badge } from "../ui/Badge";
import { FavoriteButton } from "./FavoriteButton";
import { QuantityStepper } from "../ui/QuantityStepper";
import { CarImage } from "./CarImage";
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
 *
 * `width` (grid/collection): largura fixa da coluna, calculada por
 * `useGridLayout`. Todos os cards do grid ficam do mesmo tamanho; a
 * imagem mantém `aspect-card` (4:3) e o corpo tem altura fixa.
 */
type Props = {
  car: CarListItem;
  variant?: "grid" | "row" | "collection";
  inCollection?: boolean;
  quantity?: number;
  onPress: () => void;
  onLongPress?: () => void;
  onToggleCollection?: () => void;
  onChangeQuantity?: (next: number) => void;
  onRemoveRequest?: () => void;
  accessibilityHint?: string;
  width?: number;
};

export function CarCard({
  car,
  variant = "grid",
  inCollection = false,
  quantity = 0,
  onPress,
  onLongPress,
  onToggleCollection,
  onChangeQuantity,
  onRemoveRequest,
  accessibilityHint = "Abre os detalhes",
  width,
}: Props) {
  const { scheme } = useTheme();

  if (variant === "row") {
    return (
      <View className="flex-row items-center gap-3">
        <CarImage
          uri={car.imagemThumb}
          className="aspect-card rounded-md overflow-hidden"
          style={{ width: 96 }}
        />
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
  const collectionSuffix =
    inCollection && quantity > 0
      ? `, ${quantity} ${quantity === 1 ? "unidade" : "unidades"} na sua coleção`
      : inCollection
        ? ", na sua coleção"
        : "";
  const a11yLabel = `${car.title}, ${car.brandName}, ${car.year}, número ${car.collector}${collectionSuffix}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected: inCollection }}
      onPress={onPress}
      onLongPress={onLongPress}
      className={cn(
        "rounded-lg bg-surface border border-border overflow-hidden active:bg-surface-3"
      )}
      style={[{ elevation: scheme === "light" ? 1 : 0 }, width ? { width } : null]}
    >
      <View className="relative">
        <CarImage uri={car.imagemThumb} className="w-full aspect-card" />
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
      {/* corpo do card — altura fixa 94 pt para alinhar grid (decisão do Orquestrador) */}
      <View className="p-3 gap-0.5" style={{ height: 94 }}>
        <Text variant="eyebrow" tone="subtle" numberOfLines={1}>
          {car.brandName.toUpperCase()} · {car.year}
        </Text>
        <Text variant="body-sm" className="font-sans-semibold" numberOfLines={2}>
          {car.title}
        </Text>
        {isCollection && quantity > 1 ? (
          <View className="self-start mt-0.5">
            <Badge variant="flame" size="sm">
              Repetido ×{quantity}
            </Badge>
          </View>
        ) : (
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {car.serieTitle}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
