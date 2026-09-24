import { Pressable, View } from "react-native";
import { Text } from "../ui/Text";
import { Badge } from "../ui/Badge";
import { CarImage } from "./CarImage";

/**
 * SeriesCard da Home (`componentes.md §C.8`): 280×160 pt,
 * `rounded-lg`, Badge flame "Em destaque", título e contagem.
 *
 * A imagem da série é um LOGO (150×150, WebP com transparência), não
 * uma capa: vai em `contain`, 96 pt, sobre a cor da superfície do card
 * — a transparência funciona nos temas light e dark e o logo não é
 * ampliado nem cortado. Sem imagem ou com falha no download: a
 * silhueta padrão do `CarImage` no mesmo lugar.
 */
type Props = {
  id: string;
  title: string;
  description?: string;
  image: string | null;
  carCount: number;
  onPress: () => void;
};

const LOGO_SIZE = 96;

export function SeriesCard({ title, image, carCount, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${carCount} ${carCount === 1 ? "miniatura" : "miniaturas"}, em destaque`}
      onPress={onPress}
      className="rounded-lg overflow-hidden bg-surface border border-border flex-row items-center p-4 gap-4 active:bg-surface-3"
      style={{ width: 280, height: 160 }}
    >
      <CarImage
        uri={image || null}
        contentFit="contain"
        bgClassName="bg-surface"
        placeholderScale="80%"
        style={{ width: LOGO_SIZE, height: LOGO_SIZE }}
      />
      <View className="flex-1 min-w-0 gap-1">
        <View className="self-start">
          <Badge variant="flame" size="sm">
            Em destaque
          </Badge>
        </View>
        <Text variant="h3" numberOfLines={2}>
          {title}
        </Text>
        <Text variant="body-sm" tone="muted" numberOfLines={1}>
          {carCount} {carCount === 1 ? "miniatura" : "miniaturas"}
        </Text>
      </View>
    </Pressable>
  );
}
