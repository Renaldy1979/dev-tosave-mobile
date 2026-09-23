import { Pressable, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "./Text";

/**
 * SectionHeader (componentes.md §C.7).
 *
 * Título `h2` à esquerda + subtítulo opcional `body-sm fg-muted`; à
 * direita, link "Ver tudo" `body-sm font-sans-medium text-primary-text`
 * + `ChevronRight` 16 (toque ≥ 44 pt via hitSlop).
 */
type Props = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onActionPress?: () => void;
  className?: string;
};

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onActionPress,
  className,
}: Props) {
  const { c } = useTheme();
  return (
    <View className={`flex-row items-end justify-between px-4 mb-3 ${className ?? ""}`}>
      <View className="flex-1">
        <Text variant="h2" numberOfLines={1}>{title}</Text>
        {subtitle ? (
          <Text variant="body-sm" tone="muted" numberOfLines={1} className="mt-0.5">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actionLabel && onActionPress ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={actionLabel}
          onPress={onActionPress}
          hitSlop={12}
          className="flex-row items-center active:opacity-70 pl-3"
          style={{ minHeight: 44, minWidth: 44 }}
        >
          <Text variant="body-sm" tone="primary" className="font-sans-medium">
            {actionLabel}
          </Text>
          <ChevronRight color={c("primary-text")} size={16} strokeWidth={1.75} />
        </Pressable>
      ) : null}
    </View>
  );
}
