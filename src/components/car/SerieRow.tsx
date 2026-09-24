import { Pressable, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "../ui/Text";
import { Badge } from "../ui/Badge";
import { Skeleton } from "../ui/Skeleton";
import { CarImage } from "./CarImage";

/**
 * Linha da lista de séries (`10-series.md` §A.2): logo 56 (contain,
 * silhueta sem logo), título, "N miniaturas" e "Você tem X" (X ≥ 1).
 * Séries em destaque ganham o Badge "Em destaque".
 */
type Props = {
  title: string;
  image: string | null;
  carCount: number;
  owned: number;
  featured: boolean;
  onPress: () => void;
};

export function SerieRow({ title, image, carCount, owned, featured, onPress }: Props) {
  const { c } = useTheme();
  const countLabel = `${carCount} ${carCount === 1 ? "miniatura" : "miniaturas"}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${countLabel}${owned > 0 ? `, você tem ${owned}` : ""}`}
      onPress={onPress}
      className="flex-row items-center gap-3 px-3 py-2 rounded-lg bg-surface border border-border active:bg-surface-3"
      style={{ minHeight: 72 }}
    >
      <CarImage
        uri={image || null}
        contentFit="contain"
        bgClassName="bg-surface"
        placeholderScale="80%"
        style={{ width: 56, height: 56 }}
      />
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center gap-2 flex-wrap">
          <Text variant="body" className="font-sans-semibold shrink" numberOfLines={2}>
            {title}
          </Text>
          {featured ? (
            <Badge variant="flame" size="sm">
              Em destaque
            </Badge>
          ) : null}
        </View>
        <Text variant="body-sm" tone="muted">
          {countLabel}
        </Text>
        {owned > 0 ? (
          <Text variant="caption" tone="accent" className="font-sans-semibold">
            Você tem {owned}
          </Text>
        ) : null}
      </View>
      <ChevronRight size={18} color={c("fg-subtle")} strokeWidth={1.75} />
    </Pressable>
  );
}

/** Skeleton na mesma geometria (quadrado 56 + 2 linhas). */
export function SerieRowSkeleton() {
  return (
    <View
      className="flex-row items-center gap-3 px-3 py-2 rounded-lg bg-surface border border-border"
      style={{ minHeight: 72 }}
    >
      <Skeleton.Rect style={{ width: 56, height: 56 }} />
      <View className="flex-1 gap-1.5">
        <Skeleton.Rect style={{ height: 14, width: "70%" }} />
        <Skeleton.Rect style={{ height: 10, width: "40%" }} />
      </View>
    </View>
  );
}
