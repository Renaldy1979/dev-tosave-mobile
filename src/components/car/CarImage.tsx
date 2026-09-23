import { useState } from "react";
import { View, type DimensionValue } from "react-native";
import { Image, type ImageContentFit } from "expo-image";
import { useTheme } from "@/theme/ThemeProvider";
import { cn } from "@/utils/cn";

/**
 * Imagem de miniatura com placeholder padrão.
 *
 * Sem `uri` (carro sem `imageFileId`) ou com falha no download, mostra
 * a silhueta do `logo-car` (de `_brand/`) sobre `surface-2`. É o mesmo
 * placeholder em CarCard, SeriesCard, galeria do Detalhe e Coleção.
 *
 * A falha é guardada por `uri`: com `recyclingKey`, a célula reciclada
 * que recebe outra imagem tenta carregar de novo em vez de herdar o
 * placeholder da anterior.
 */
type Props = {
  uri: string | null | undefined;
  contentFit?: ImageContentFit;
  /** Largura da silhueta, relativa ao palco. */
  placeholderScale?: `${number}%`;
  transition?: number;
  accessibilityLabel?: string;
  className?: string;
  style?: StageStyle;
};

/** Dimensões do palco — servem tanto ao `Image` quanto ao placeholder. */
export type StageStyle = {
  width?: DimensionValue;
  height?: DimensionValue;
  aspectRatio?: number;
  borderRadius?: number;
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOGO_CAR = require("../../../_brand/logo-car.png");

export function CarImage({
  uri,
  contentFit = "cover",
  placeholderScale = "55%",
  transition = 200,
  accessibilityLabel,
  className,
  style,
}: Props) {
  const [failedUri, setFailedUri] = useState<string | null>(null);

  if (!uri || failedUri === uri) {
    return (
      <CarImagePlaceholder
        scale={placeholderScale}
        className={className}
        style={style}
        accessibilityLabel={accessibilityLabel}
      />
    );
  }
  return (
    <Image
      source={{ uri }}
      recyclingKey={uri}
      contentFit={contentFit}
      transition={transition}
      onError={() => setFailedUri(uri)}
      accessibilityLabel={accessibilityLabel}
      className={cn("bg-surface-2", className)}
      style={style}
    />
  );
}

/** Silhueta do `logo-car` sobre `surface-2`, centralizada no palco. */
export function CarImagePlaceholder({
  scale = "55%",
  className,
  style,
  accessibilityLabel,
}: {
  scale?: `${number}%`;
  className?: string;
  style?: StageStyle;
  accessibilityLabel?: string;
}) {
  const { c } = useTheme();
  return (
    <View
      accessible={Boolean(accessibilityLabel)}
      accessibilityRole={accessibilityLabel ? "image" : undefined}
      accessibilityLabel={accessibilityLabel}
      className={cn("bg-surface-2 items-center justify-center overflow-hidden", className)}
      style={style}
    >
      <Image
        source={LOGO_CAR}
        contentFit="contain"
        tintColor={c("fg-subtle")}
        style={{ width: scale, aspectRatio: 644 / 160, opacity: 0.35 }}
      />
    </View>
  );
}
