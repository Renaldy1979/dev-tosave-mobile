import { useState } from "react";
import { View, type DimensionValue } from "react-native";
import { Image } from "expo-image";
import { Newspaper } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * Imagem de notícia com placeholder (`Newspaper` sobre `surface-2`),
 * no mesmo espírito do `CarImage` (falha guardada por `uri`, recicla
 * certo em lista virtualizada).
 */
type Props = {
  uri: string | null;
  width: DimensionValue;
  height: DimensionValue;
  borderRadius?: number;
};

export function NewsImage({ uri, width, height, borderRadius = 8 }: Props) {
  const { c } = useTheme();
  const [failedUri, setFailedUri] = useState<string | null>(null);

  if (!uri || failedUri === uri) {
    return (
      <View
        className="bg-surface-2 items-center justify-center overflow-hidden"
        style={{ width, height, borderRadius }}
      >
        <Newspaper color={c("fg-subtle")} size={24} strokeWidth={1.75} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      recyclingKey={uri}
      cachePolicy="memory-disk"
      contentFit="cover"
      transition={200}
      onError={() => setFailedUri(uri)}
      style={{ width, height, borderRadius }}
    />
  );
}
