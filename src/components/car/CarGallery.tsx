import { useRef, useState } from "react";
import { Dimensions, FlatList, Pressable, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { Image } from "expo-image";
import { Car } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "@/components/ui/Text";
import { GalleryViewer } from "./GalleryViewer";

/**
 * CarGallery (componentes.md §15.1).
 *
 * `FlatList horizontal pagingEnabled` com largura total e altura
 * `aspect-gallery` (4:3). Imagens: `imagemFull` primeiro, depois
 * `images` ordenadas por `position`. Indicador: dots na base; com mais
 * de 6 imagens vira contador mono `2 / 5` em Badge glass no canto
 * inferior direito.
 *
 * Tocar abre o `GalleryViewer` no índice atual.
 */
type Props = {
  images: { id: string; uri: string }[];
  title?: string;
};

const SCREEN = Dimensions.get("window");

export function CarGallery({ images, title }: Props) {
  const { c } = useTheme();
  const [index, setIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const listRef = useRef<FlatList<{ id: string; uri: string }>>(null);

  const total = images.length;

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(event.nativeEvent.contentOffset.x / SCREEN.width);
    if (i !== index) setIndex(Math.max(0, Math.min(total - 1, i)));
  };

  if (total === 0) {
    return (
      <View
        className="w-full items-center justify-center bg-surface-2"
        style={{ height: SCREEN.width * 0.75 }}
      >
        <Car color={c("fg-subtle")} size={56} strokeWidth={1.75} opacity={0.4} />
      </View>
    );
  }

  return (
    <>
      <FlatList
        ref={listRef}
        data={images}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        renderItem={({ item }) => (
          <PressableImage uri={item.uri} onPress={() => setViewerOpen(true)} />
        )}
      />
      {total > 1 ? (
        total > 6 ? (
          <View pointerEvents="none" className="absolute" style={{ right: 12, bottom: 12 }}>
            <View className="rounded-xs bg-black/50 px-2 h-6 flex-row items-center justify-center">
              <Text variant="caption" className="font-mono text-white">
                {index + 1} / {total}
              </Text>
            </View>
          </View>
        ) : (
          <View
            pointerEvents="none"
            className="absolute flex-row items-center justify-center"
            style={{ left: 0, right: 0, bottom: 12, gap: 6 }}
          >
            {Array.from({ length: total }).map((_, i) => (
              <View
                key={i}
                className="rounded-full"
                style={{
                  width: i === index ? 16 : 6,
                  height: 6,
                  backgroundColor: i === index ? c("primary") : "rgba(255,255,255,0.4)",
                }}
              />
            ))}
          </View>
        )
      ) : null}
      <GalleryViewer
        images={images}
        title={title}
        initialIndex={index}
        open={viewerOpen}
        onClose={(last) => {
          setIndex(last);
          // Rola o pager para o último índice visto (item 21 da revisão).
          requestAnimationFrame(() => {
            try {
              listRef.current?.scrollToIndex({ index: last, animated: false });
            } catch {
              // ignore — getItemLayout ausente; sem scroll programático
            }
          });
          setViewerOpen(false);
        }}
      />
    </>
  );
}

function PressableImage({ uri, onPress }: { uri: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="image"
      accessibilityLabel="Toque para ampliar"
      onPress={onPress}
      style={{ width: SCREEN.width, height: SCREEN.width * 0.75 }}
    >
      <Image
        source={{ uri }}
        recyclingKey={uri}
        style={{ width: SCREEN.width, height: SCREEN.width * 0.75 }}
        contentFit="cover"
        transition={200}
      />
    </Pressable>
  );
}
