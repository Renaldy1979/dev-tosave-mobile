import { Pressable, View } from "react-native";
import { Text } from "../ui/Text";
import { Skeleton } from "../ui/Skeleton";
import { NewsImage } from "./NewsImage";
import { formatDateShort } from "@/utils/formatDate";

/**
 * Card de notícia: imagem 88×88, título, data e resumo. Usado no feed
 * (`app/(drawer)/noticias.tsx`) e na seção "Últimas notícias" da Home.
 */
type Props = {
  title: string;
  summary: string;
  publishedAt: string;
  image: string | null;
  onPress: () => void;
};

const IMAGE_SIZE = 88;

export function NewsCard({ title, summary, publishedAt, image, onPress }: Props) {
  const date = formatDateShort(publishedAt);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={date ? `${title}, ${date}` : title}
      onPress={onPress}
      className="flex-row gap-3 px-3 py-2 rounded-lg bg-surface border border-border active:bg-surface-3"
      style={{ minHeight: IMAGE_SIZE + 16 }}
    >
      <NewsImage uri={image} width={IMAGE_SIZE} height={IMAGE_SIZE} />
      <View className="flex-1 min-w-0 justify-center gap-1">
        {date ? (
          <Text variant="caption" tone="muted">
            {date}
          </Text>
        ) : null}
        <Text variant="body" className="font-sans-semibold" numberOfLines={2}>
          {title}
        </Text>
        {summary ? (
          <Text variant="body-sm" tone="muted" numberOfLines={2}>
            {summary}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Skeleton na mesma geometria do card. */
export function NewsCardSkeleton() {
  return (
    <View
      className="flex-row gap-3 px-3 py-2 rounded-lg bg-surface border border-border"
      style={{ minHeight: IMAGE_SIZE + 16 }}
    >
      <Skeleton.Rect style={{ width: IMAGE_SIZE, height: IMAGE_SIZE }} />
      <View className="flex-1 justify-center gap-1.5">
        <Skeleton.Rect style={{ height: 10, width: "30%" }} />
        <Skeleton.Rect style={{ height: 14, width: "80%" }} />
        <Skeleton.Rect style={{ height: 10, width: "60%" }} />
      </View>
    </View>
  );
}
