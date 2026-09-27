import { Pressable, View } from "react-native";
import { Text } from "../ui/Text";
import { Skeleton } from "../ui/Skeleton";
import { useTheme } from "@/theme/ThemeProvider";
import { formatDateShort } from "@/utils/formatDate";

/**
 * Linha da caixa de notificações: ponto `primary` para não lida,
 * título em negrito quando não lida, corpo em 2 linhas e data curta.
 */
type Props = {
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  onPress: () => void;
};

export function NotificationRow({ title, body, read, createdAt, onPress }: Props) {
  const { c } = useTheme();
  const date = formatDateShort(createdAt);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}${read ? "" : ", não lida"}${date ? `, ${date}` : ""}`}
      onPress={onPress}
      className="flex-row gap-3 px-4 py-3 rounded-lg bg-surface border border-border active:bg-surface-3"
      style={{ minHeight: 44 }}
    >
      <View style={{ paddingTop: 6 }}>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: read ? "transparent" : c("primary"),
          }}
        />
      </View>
      <View className="flex-1 min-w-0 gap-0.5">
        <View className="flex-row items-baseline justify-between gap-2">
          <Text
            variant="body"
            tone={read ? "muted" : "fg"}
            className={read ? "flex-1" : "flex-1 font-sans-semibold"}
            numberOfLines={2}
          >
            {title}
          </Text>
          {date ? (
            <Text variant="caption" tone="subtle" numberOfLines={1}>
              {date}
            </Text>
          ) : null}
        </View>
        {body ? (
          <Text variant="body-sm" tone="muted" numberOfLines={2}>
            {body}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Skeleton na mesma geometria da linha. */
export function NotificationRowSkeleton() {
  return (
    <View
      className="flex-row gap-3 px-4 py-3 rounded-lg bg-surface border border-border"
      style={{ minHeight: 44 }}
    >
      <View style={{ paddingTop: 6 }}>
        <Skeleton.Circle size={8} />
      </View>
      <View className="flex-1 gap-1.5">
        <Skeleton.Rect style={{ height: 14, width: "70%" }} />
        <Skeleton.Rect style={{ height: 10, width: "90%" }} />
      </View>
    </View>
  );
}
