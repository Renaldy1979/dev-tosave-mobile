import { useState } from "react";
import { View, type DimensionValue } from "react-native";
import { Image, type ImageContentFit } from "expo-image";
import { cssInterop } from "nativewind";
import { useTheme } from "@/theme/ThemeProvider";
import { cn } from "@/utils/cn";

// O NativeWind só converte `className` dos componentes do React Native.
// Sem isto, o `className` do `Image` do expo-image é ignorado: a imagem
// fica sem largura/altura e não aparece (era o caso do CarCard).
cssInterop(Image, { className: "style" });

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
  /** Fundo do palco (padrão `bg-surface-2`). Logos com transparência
   *  usam a cor da superfície onde estão. */
  bgClassName?: string;
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
  bgClassName = "bg-surface-2",
}: Props) {
  const [failedUri, setFailedUri] = useState<string | null>(null);

  if (!uri || failedUri === uri) {
    return (
      <CarImagePlaceholder
        scale={placeholderScale}
        className={className}
        style={style}
        accessibilityLabel={accessibilityLabel}
        bgClassName={bgClassName}
      />
    );
  }
  return (
    <Image
      source={{ uri }}
      recyclingKey={uri}
      cachePolicy="memory-disk"
      contentFit={contentFit}
      transition={transition}
      onError={(event) => {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn("[images] falha ao carregar", uri, event.error);
        }
        setFailedUri(uri);
      }}
      accessibilityLabel={accessibilityLabel}
      className={cn(bgClassName, className)}
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
  bgClassName = "bg-surface-2",
}: {
  scale?: `${number}%`;
  className?: string;
  style?: StageStyle;
  accessibilityLabel?: string;
  bgClassName?: string;
}) {
  const { c } = useTheme();
  return (
    <View
      accessible={Boolean(accessibilityLabel)}
      accessibilityRole={accessibilityLabel ? "image" : undefined}
      accessibilityLabel={accessibilityLabel}
      className={cn(bgClassName, "items-center justify-center overflow-hidden", className)}
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
