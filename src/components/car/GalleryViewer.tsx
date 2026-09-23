import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { CarImage } from "./CarImage";
import { X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { ThemeScope } from "@/components/ui/ThemeScope";
import { IconButton } from "@/components/ui/IconButton";
import { Text } from "@/components/ui/Text";

/**
 * GalleryViewer (componentes.md §15.2).
 *
 * Modal em tela cheia (sempre preto, `ThemeScope dark`) com pager
 * horizontal. Cada página mostra a imagem em `contain`. Controles
 * sobreposto: X à esquerda, título centralizado e contador mono à
 * direita; tira de thumbs na base quando há ≥ 3 imagens.
 *
 * A versão da fase 1 foca no essencial: pager, contador, fechar. As
 * interações avançadas (pinch, duplo toque, arrastar para fechar)
 * estão previstas para evolução — o modal já respeita as gestures
 * nativas (swipe entre páginas).
 */
type Props = {
  images: { id: string; uri: string }[];
  initialIndex: number;
  open: boolean;
  onClose: (lastIndex: number) => void;
  title?: string;
};

const SCREEN = Dimensions.get("window");

export function GalleryViewer({ images, initialIndex, open, onClose, title }: Props) {
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  // Reseta o índice sempre que o modal abre (item 21 da revisão: o
  // useState inicial só roda uma vez e a 2ª abertura mostra o índice
  // antigo).
  const [index, setIndex] = useState(initialIndex);
  useEffect(() => {
    if (open) setIndex(Math.max(0, Math.min(images.length - 1, initialIndex)));
  }, [open, initialIndex, images.length]);
  const listRef = useRef<FlatList<{ id: string; uri: string }>>(null);

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(event.nativeEvent.contentOffset.x / SCREEN.width);
    setIndex(Math.max(0, Math.min(images.length - 1, i)));
  };

  return (
    <Modal
      visible={open}
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={() => onClose(index)}
    >
      <ThemeScope>
        <View className="flex-1 bg-black">
          {/* Pager */}
          <FlatList
            ref={listRef}
            data={images}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={Math.max(0, Math.min(images.length - 1, initialIndex))}
            onMomentumScrollEnd={handleMomentumEnd}
            getItemLayout={(_, i) => ({
              length: SCREEN.width,
              offset: SCREEN.width * i,
              index: i,
            })}
            renderItem={({ item }) => (
              <View
                style={{ width: SCREEN.width, height: SCREEN.height }}
                className="items-center justify-center"
              >
                <CarImage
                  uri={item.uri}
                  style={{ width: SCREEN.width, height: SCREEN.height * 0.7 }}
                  contentFit="contain"
                  transition={150}
                  accessibilityLabel={title ? `Foto de ${title}` : undefined}
                />
              </View>
            )}
          />

          {/* Controles topo */}
          <View
            pointerEvents="box-none"
            className="absolute left-0 right-0 flex-row items-center justify-between px-3"
            style={{ paddingTop: insets.top + 8 }}
          >
            <IconButton
              icon={X}
              variant="glass"
              size="md"
              accessibilityLabel="Fechar galeria"
              onPress={() => onClose(index)}
            />
            {title ? (
              <Text
                variant="body-sm"
                className="text-white flex-1 text-center mx-3"
                numberOfLines={1}
              >
                {title}
              </Text>
            ) : (
              <View className="flex-1" />
            )}
            <Text variant="caption" className="text-white font-mono">
              {index + 1} / {images.length}
            </Text>
          </View>

          {/* Thumbs (base) */}
          {images.length >= 3 ? (
            <View
              pointerEvents="box-none"
              className="absolute left-0 right-0 items-center"
              style={{ paddingBottom: Math.max(insets.bottom, 12) + 8, bottom: 0 }}
            >
              <View className="flex-row items-center gap-2 px-3">
                {images.map((img, i) => {
                  const active = i === index;
                  return (
                    <Pressable
                      key={img.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Ir para foto ${i + 1}`}
                      onPress={() => {
                        listRef.current?.scrollToIndex({ index: i, animated: true });
                        setIndex(i);
                      }}
                      style={{
                        width: 48,
                        height: 36,
                        borderRadius: 4,
                        overflow: "hidden",
                        borderWidth: active ? 2 : 0,
                        borderColor: active ? c("primary") : "transparent",
                      }}
                    >
                      <CarImage
                        uri={img.uri}
                        style={{ width: "100%", height: "100%" }}
                        placeholderScale="80%"
                        transition={150}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>
      </ThemeScope>
    </Modal>
  );
}
