import { Image } from "expo-image";
import { Layers } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "../ui/Text";
import { Badge } from "../ui/Badge";

/**
 * SeriesCard da Home (`componentes.md §C.8`):
 * 280×160 pt, `rounded-lg overflow-hidden`, imagem cover, gradiente
 * preto na base, título h3 branco, descrição 1 linha white/70,
 * Badge flame "Em destaque" no canto superior.
 *
 * Sem imagem: palco `surface-2` com `Layers` 40 pt e o título.
 */
type Props = {
  id: string;
  title: string;
  description?: string;
  image: string | null;
  carCount: number;
  onPress: () => void;
};

export function SeriesCard({ id, title, description, image, carCount, onPress }: Props) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${carCount} ${carCount === 1 ? "miniatura" : "miniaturas"}, em destaque`}
      onPress={onPress}
      className="rounded-lg overflow-hidden bg-surface-2 active:opacity-90"
      style={{ width: 280, height: 160 }}
    >
      {image ? (
        <Image
          source={{ uri: image }}
          style={{ width: "100%", height: "100%" }}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View className="flex-1 items-center justify-center">
          <Layers color={c("fg-subtle")} size={40} strokeWidth={1.75} opacity={0.6} />
        </View>
      )}
      {/* gradiente preto 0 → 80% de baixo para cima */}
      <LinearGradient
        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.8)"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 100,
        }}
      />
      <View className="absolute top-2 left-2">
        <Badge variant="flame" size="sm">
          Em destaque
        </Badge>
      </View>
      <View className="absolute bottom-3 left-3 right-3 gap-0.5">
        <Text variant="h3" className="text-white" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="body-sm" className="text-white/70" numberOfLines={1}>
          {carCount} {carCount === 1 ? "miniatura" : "miniaturas"}
        </Text>
      </View>
    </Pressable>
  );
}
