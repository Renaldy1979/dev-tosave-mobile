import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import {
  useLocalSearchParams,
  useRouter,
} from "expo-router";
import { Archive, Calendar, Hash, Layers, Palette, Ruler, Sparkles, Tag } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
// useCurrentUser removido na fase 2.
import { useDelayedFlag } from "@/hooks/useDelayedFlag";
import { useCollectionStore } from "@/hooks/useCollectionStore";
import {
  getCarById,
  listBySeriePaged,
} from "@/services";
import { CarListItem, CarDetail } from "@/types";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { FavoriteButton } from "@/components/car/FavoriteButton";
import { CarCard } from "@/components/car/CarCard";
import { CarGallery } from "@/components/car/CarGallery";
import { CarDetailSkeleton } from "@/components/car/CarCardSkeleton";
import { CollectionPanel } from "@/components/car/CollectionPanel";
import { Header } from "@/components/ui/Header";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { InfoRow } from "@/components/ui/InfoRow";
import { ColorBadge } from "@/components/ui/ColorBadge";
import { ShareWhatsAppButton } from "@/components/ui/ShareWhatsAppButton";
import { useToast } from "@/components/ui/Toast";

/**
 * Tela de detalhe do carro (`docs/design/telas/05-car-detalhe.md`).
 *
 * Stack sobre as tabs (sem TabBar), Header transparente no topo da
 * galeria, folha surface subindo 16 pt sobre a galeria. Conteúdo:
 * identidade (marca · ano · escala · título · série/posição),
 * CollectionPanel (se na coleção), Sobre, Ficha técnica, Atributos,
 * Mais da série. ActionBar fixa na base (Compartilhar + Adicionar).
 */
export default function CarDetalhe() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id ?? "";
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  // App travado na fase 2 — sem sessão nunca chegamos aqui. A sessão
  // é checada no nível do `_layout` raiz.
  // useCurrentUser removido: nada aqui depende mais de `user`.
  const { show } = useToast();

  const [detail, setDetail] = useState<CarDetail | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ok" | "error" | "not-found">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [related, setRelated] = useState<CarListItem[]>([]);
  const [relatedState, setRelatedState] = useState<"loading" | "ok" | "error">("loading");
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [isReadMoreShown, setIsReadMoreShown] = useState(false);

  const collection = useCollectionStore();
  // Lê a quantidade direto do store compartilhado (atualiza em tempo real).
  const quantity = detail ? collection.items[detail.id] ?? 0 : 0;
  const showSkeleton = useDelayedFlag(loadState === "loading", 150);
  const inCollection = quantity > 0;

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  const scrollRef = useRef<Animated.ScrollView>(null);

  // ----- Carga -----
  const load = useCallback(async () => {
    if (!id) {
      setLoadState("not-found");
      return;
    }
    setLoadState("loading");
    setErrorMsg(null);
    try {
      const car = await getCarById(id);
      if (!car) {
        setLoadState("not-found");
        setDetail(null);
        return;
      }
      setDetail(car);
      setLoadState("ok");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao carregar.");
      setLoadState("error");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!detail) {
      setRelated([]);
      return;
    }
    setRelatedState("loading");
    void listBySeriePaged(detail.serieId, { excludeId: detail.id, page: 1, pageSize: 10 })
      .then((r) => {
        setRelated(r.items);
        setRelatedState("ok");
      })
      .catch(() => {
        setRelated([]);
        setRelatedState("error");
      });
  }, [detail]);

  // ----- Ações -----
  const handleAdd = useCallback(async () => {
    if (!detail) return;
    // Para visitante, o store cuida de abrir o login via `onRequireSession`.
    try {
      await collection.toggle(detail.id);
      // Se o usuário não estava logado, o store não fez a operação —
      // não disparamos Toast de sucesso nesse caso.
      if (collection.items[detail.id] && collection.items[detail.id]! > 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        show({
          type: "success",
          message: "Adicionada à sua coleção.",
          action: { label: "Ver", onPress: () => router.navigate("/colecao") },
        });
      }
    } catch {
      show({ type: "danger", message: "Não foi possível atualizar sua coleção." });
    }
  }, [detail, collection, show, router]);

  const handleChangeQuantity = useCallback(
    async (next: number) => {
      if (!detail) return;
      try {
        await collection.setQuantity(detail.id, next);
      } catch {
        show({ type: "danger", message: "Não foi possível atualizar sua coleção." });
      }
    },
    [detail, collection, show]
  );

  const handleRemove = useCallback(async () => {
    if (!detail) return;
    try {
      await collection.remove(detail.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
      show({ type: "info", message: "Removida da sua coleção." });
    } catch {
      show({ type: "danger", message: "Não foi possível atualizar sua coleção." });
    }
  }, [detail, collection, show]);

  // ----- Dados derivados -----
  const images = useMemo(() => {
    if (!detail) return [];
    const list: { id: string; uri: string }[] = [];
    if (detail.imagemFull) list.push({ id: `${detail.id}-full`, uri: detail.imagemFull });
    detail.images.forEach((img) => list.push({ id: img.id, uri: img.path }));
    return list;
  }, [detail]);

  const galleryImages = images;

  // ----- Estados -----
  if (loadState === "not-found") {
    return (
      <ScreenContainer bg="bg" edges={["top", "bottom"]} className="bg-bg">
        <Header variant="stack" title="Detalhe" />
        <View className="flex-1 items-center justify-center px-8">
          <EmptyState
            kind="no-cars"
            description="Esse carro pode ter sido removido do catálogo."
            action={{ label: "Voltar ao início", onPress: () => router.replace("/(tabs)") }}
          />
        </View>
      </ScreenContainer>
    );
  }

  if (loadState === "error") {
    return (
      <ScreenContainer bg="bg" edges={["top", "bottom"]} className="bg-bg">
        <Header variant="stack" title="Detalhe" />
        <View className="flex-1 items-center justify-center px-8">
          <ErrorState onRetry={load} />
        </View>
      </ScreenContainer>
    );
  }

  if (loadState === "loading" && showSkeleton) {
    return (
      <ScreenContainer bg="bg" edges={["bottom"]} className="bg-bg">
        <Header variant="stack" title="Carregando..." back />
        <CarDetailSkeleton />
      </ScreenContainer>
    );
  }

  if (!detail) {
    // Conteúdo ainda não chegou mas não estamos mais "loading" — showSkeleton é false nesse caso.
    // Mantém um fallback mínimo para evitar flash.
    return (
      <ScreenContainer bg="bg" edges={["top", "bottom"]} className="bg-bg">
        <Header variant="stack" title="Detalhe" back />
      </ScreenContainer>
    );
  }

  // Renderização principal
  const showMoreBadge = detail.brand?.state === "descontinuada";
  const eyebrow = [detail.brand.name, detail.year, detail.scale].filter(Boolean).join(" · ");
  const serieTitle = detail.serie.title;
  const serieHasHighlight = Boolean(detail.serie.isDefault);

  return (
    <ScreenContainer bg="bg" edges={["bottom"]} className="bg-bg">
      {/* Header transparente flutua sobre a galeria. A galeria está
          DENTRO do ScrollView (item 14 da revisão) — não fica mais fixa. */}
      <Header
        variant="transparent"
        title={detail.title}
        scrollY={scrollY}
      />

      <Animated.ScrollView
        ref={scrollRef}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 16 + insets.bottom + 56 + 24 + 64 }}
      >
        {/* Galeria no topo do scroll (item 14 da revisão). */}
        <CarGallery images={galleryImages} title={detail.title} />

        {/* Folha surface subindo 16 pt sobre a galeria */}
        <View className="-mt-4 rounded-t-xl bg-bg">
          {/* Identidade */}
        <View className="px-4 pt-5">
          <Text variant="eyebrow" tone="subtle" numberOfLines={1}>
            {eyebrow.toUpperCase()}
          </Text>
          <Text
            variant="display-md"
            className="font-display-black mt-1"
            numberOfLines={3}
          >
            {detail.title}
          </Text>

          {/* Badges de série/posição/destaque */}
          <View className="flex-row items-center gap-1.5 mt-3 flex-wrap">
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`Ver outros carros da série ${serieTitle}`}
              onPress={() =>
                router.push({ pathname: "/busca", params: { serie: detail.serieId } })
              }
              hitSlop={10}
              style={{ minHeight: 44, minWidth: 44, justifyContent: "center" }}
            >
              <Badge variant="primary" size="md">
                {serieTitle}
              </Badge>
            </Pressable>
            {detail.seriePosition ? (
              <Badge variant="neutral" size="md">
                {detail.seriePosition}
              </Badge>
            ) : null}
            {serieHasHighlight ? (
              <Badge variant="flame" size="md">
                Em destaque
              </Badge>
            ) : null}
            {showMoreBadge ? (
              <Badge variant="neutral" size="md" icon={Archive}>
                Descontinuada
              </Badge>
            ) : null}
          </View>
        </View>

        {/* CollectionPanel — app travado, sempre logado. */}
        {inCollection ? (
          <CollectionPanel
            visible
            quantity={quantity}
            carTitle={detail.title}
            onChange={handleChangeQuantity}
            onRemove={handleRemove}
          />
        ) : null}

        {/* Sobre */}
        {detail.description ? (
          <View className="mt-6 px-4">
            <Text variant="h2">Sobre</Text>
            <Pressable onPress={() => setDescriptionExpanded(false)}>
              <Text
                variant="body-lg"
                tone="muted"
                className="mt-2"
                numberOfLines={descriptionExpanded ? undefined : 5}
                onTextLayout={(event) => {
                  const lines = event.nativeEvent.lines.length;
                  setIsReadMoreShown(lines >= 5);
                }}
              >
                {detail.description}
              </Text>
            </Pressable>
            {isReadMoreShown && !descriptionExpanded ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ler mais"
                onPress={() => setDescriptionExpanded(true)}
                hitSlop={12}
                style={{ minHeight: 44, justifyContent: "center" }}
                className="mt-2 self-start active:opacity-70"
              >
                <Text variant="body" tone="primary" className="font-sans-medium">
                  Ler mais
                </Text>
              </Pressable>
            ) : null}
            {descriptionExpanded && isReadMoreShown ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ler menos"
                onPress={() => setDescriptionExpanded(false)}
                hitSlop={12}
                style={{ minHeight: 44, justifyContent: "center" }}
                className="mt-2 self-start active:opacity-70"
              >
                <Text variant="body" tone="primary" className="font-sans-medium">
                  Ler menos
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* Ficha técnica */}
        <View className="mt-6">
          <View className="px-4 mb-2">
            <Text variant="h2">Ficha</Text>
          </View>
          <View className="bg-surface">
            {detail.brand.name ? (
              <InfoRow
                icon={Tag}
                label="Marca"
                value={detail.brand.name}
                navigate
                onPress={() =>
                  router.push({ pathname: "/busca", params: { brand: detail.brandId } })
                }
              />
            ) : null}
            {detail.collector ? (
              <InfoRow icon={Hash} label="Número" value={`#${detail.collector}`} copyable />
            ) : null}
            {detail.toy ? (
              <InfoRow icon={Hash} label="Código (toy)" value={detail.toy} copyable mono />
            ) : null}
            {detail.year ? (
              <InfoRow
                icon={Calendar}
                label="Ano"
                value={String(detail.year)}
                navigate
                onPress={() =>
                  router.push({ pathname: "/busca", params: { year: String(detail.year) } })
                }
              />
            ) : null}
            {detail.serie?.title ? (
              <InfoRow
                icon={Layers}
                label="Série"
                value={detail.serie.title}
                navigate
                onPress={() =>
                  router.push({ pathname: "/busca", params: { serie: detail.serieId } })
                }
              />
            ) : null}
            {detail.seriePosition ? (
              <InfoRow icon={Layers} label="Posição" value={detail.seriePosition} mono />
            ) : null}
            {detail.scale ? (
              <InfoRow icon={Ruler} label="Escala" value={detail.scale} mono />
            ) : null}
            {detail.color ? (
              <InfoRow icon={Palette} label="Cor" className="border-b-0">
                <ColorBadge color={detail.color} />
              </InfoRow>
            ) : null}
          </View>
        </View>

        {/* Atributos */}
        {detail.attributes.length > 0 ? (
          <View className="mt-6 px-4">
            <Text variant="h2">Atributos</Text>
            <View className="flex-row flex-wrap gap-1.5 mt-3">
              {detail.attributes.map((attr) => (
                <Pressable
                  key={attr.id}
                  accessibilityRole="link"
                  accessibilityLabel={`Buscar por atributo ${attr.title}`}
                  onPress={() =>
                    router.push({ pathname: "/busca", params: { attr: attr.id } })
                  }
                  hitSlop={10}
                  style={{ minHeight: 44, minWidth: 44, justifyContent: "center" }}
                >
                  <Badge variant="neutral" size="md" icon={Sparkles}>
                    {attr.title}
                  </Badge>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {/* Mais da série */}
        {related.length > 0 ? (
          <View className="mt-8">
            <SectionHeader
              title="Mais da série"
              actionLabel="Ver tudo"
              onActionPress={() =>
                router.push({ pathname: "/busca", params: { serie: detail.serieId } })
              }
            />
            <Animated.ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            >
              {related.map((item) => (
                <View key={item.id} style={{ width: 150 }}>
                  <CarCard car={item} variant="grid" onPress={() => router.push(`/car/${item.id}`)} />
                </View>
              ))}
            </Animated.ScrollView>
          </View>
        ) : relatedState === "loading" ? (
          <View className="mt-8 px-4">
            <Text variant="h2">Mais da série</Text>
            <View className="flex-row gap-3 mt-3">
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  className="rounded-lg bg-surface-3"
                  style={{ width: 150, height: 200 }}
                >
                  <ActivityIndicator color={c("fg-subtle")} style={{ marginTop: 80 }} />
                </View>
              ))}
            </View>
          </View>
        ) : null}
        </View>
      </Animated.ScrollView>

      {/* ActionBar fixa. `ScreenContainer edges=["bottom"]` já aplica o
          inset inferior — o `bottom: 0` deixa o componente começar na
          borda, então somar `insets.bottom` aqui duplica o valor (item 18). */}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
        }}
      >
        <View
          className="flex-row items-center gap-2 px-4 pt-3 pb-3 bg-surface border-t border-border"
        >
          <View className="flex-1">
            <ShareWhatsAppButton
              variant="button"
              car={{
                title: detail.title,
                brandName: detail.brand.name,
                year: detail.year,
                collector: detail.collector,
                toy: detail.toy,
                serieTitle: detail.serie.title,
              }}
            />
          </View>
          <View className="flex-[2]">
            {inCollection ? (
              <Button
                label={`Na coleção · ${quantity}`}
                variant="outline"
                size="lg"
                fullWidth
                onPress={() => {
                  scrollRef.current?.scrollTo({ y: 0, animated: true });
                }}
              >
                {/* Espaçador para o coração */}
              </Button>
            ) : (
              <Button
                label="Adicionar à coleção"
                variant="primary"
                size="lg"
                fullWidth
                onPress={handleAdd}
              />
            )}
          </View>
        </View>
      </View>
    </ScreenContainer>
  );
}
