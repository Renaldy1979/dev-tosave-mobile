import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { getSerie, getSerieOwnership, listAllCarsBySerie, type SerieWithCount } from "@/services";
import { useCollectionStore } from "@/hooks/useCollectionStore";
import { useCollectionHeart } from "@/hooks/useCollectionHeart";
import { useDelayedFlag } from "@/hooks/useDelayedFlag";
import { useGridLayout } from "@/hooks/useGridColumns";
import type { CarListItem } from "@/types";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Header } from "@/components/ui/Header";
import { Text } from "@/components/ui/Text";
import { Badge } from "@/components/ui/Badge";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ProgressBar, percentLabel } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { CarCard } from "@/components/car/CarCard";
import { CarGridSkeleton } from "@/components/car/CarCardSkeleton";
import { CarImage } from "@/components/car/CarImage";

type Filtro = "todos" | "colecao" | "faltam";
type LoadState = "loading" | "ok" | "not-found" | "error";

function parseFiltro(value: string | undefined): Filtro {
  return value === "colecao" || value === "faltam" ? value : "todos";
}

/**
 * Tela da série (`docs/design/telas/10-series.md` §B): stack com
 * voltar, fora do drawer. Cabeçalho com logo, título, "Você tem X de
 * N" e barra; segmento Todos / Na coleção / Faltam (param `filtro`) e o
 * grid do CarCard igual ao da Home, pela posição na série.
 *
 * A posse da série é lida no servidor (`getSerieOwnership`) e mesclada
 * no store da coleção — o mesmo do coração —, então contagem, barra e
 * corações andam juntos e ficam certos para coleção de qualquer tamanho. Em "Faltam", um carro adicionado fica
 * visível até trocar de segmento ou atualizar.
 */
export default function SerieScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; filtro?: string }>();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { show } = useToast();
  const collection = useCollectionStore();
  const { mergeOwnership } = collection;
  const heart = useCollectionHeart();
  const grid = useGridLayout();

  const [serie, setSerie] = useState<SerieWithCount | null>(null);
  const [cars, setCars] = useState<CarListItem[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [refreshing, setRefreshing] = useState(false);
  const filtro = parseFiltro(params.filtro);
  // Carros que faltavam quando "Faltam" foi aberto: continuam na lista
  // mesmo depois de adicionados, até trocar de segmento ou atualizar.
  const [missingSnapshot, setMissingSnapshot] = useState<Set<string> | null>(null);

  const owns = useCallback((carId: string) => (collection.items[carId] ?? 0) > 0, [collection.items]);

  const load = useCallback(
    async (mode: "initial" | "refresh") => {
      if (!params.id) return;
      if (mode === "initial") setLoadState("loading");
      try {
        const [s, list, ownership] = await Promise.all([
          getSerie(params.id),
          listAllCarsBySerie(params.id),
          getSerieOwnership(params.id),
        ]);
        if (!s) {
          setLoadState("not-found");
          return;
        }
        mergeOwnership(list, ownership);
        setSerie(s);
        setCars(list);
        setMissingSnapshot(null);
        setLoadState("ok");
      } catch {
        if (mode === "refresh") show({ type: "danger", message: "Não foi possível atualizar." });
        else setLoadState("error");
      }
    },
    [params.id, show, mergeOwnership]
  );

  useEffect(() => {
    void load("initial");
  }, [load]);

  const total = cars.length;
  const ownedCount = useMemo(() => cars.filter((car) => owns(car.id)).length, [cars, owns]);
  const missingCount = total - ownedCount;
  const complete = total > 0 && ownedCount === total;

  // Vindo das Estatísticas com `filtro=faltam` numa série completa: abre
  // em Todos. Só na entrada; tocar em "Faltam" depois mostra o vazio.
  const entryChecked = useRef(false);
  useEffect(() => {
    if (loadState !== "ok" || entryChecked.current) return;
    entryChecked.current = true;
    if (filtro === "faltam" && missingCount === 0) router.setParams({ filtro: "todos" });
  }, [loadState, filtro, missingCount, router]);

  // Tira a foto dos que faltam ao entrar em "Faltam".
  useEffect(() => {
    if (loadState !== "ok") return;
    if (filtro === "faltam" && missingSnapshot === null) {
      setMissingSnapshot(new Set(cars.filter((car) => !owns(car.id)).map((car) => car.id)));
    } else if (filtro !== "faltam" && missingSnapshot !== null) {
      setMissingSnapshot(null);
    }
  }, [filtro, loadState, cars, owns, missingSnapshot]);

  const visible = useMemo(() => {
    if (filtro === "colecao") return cars.filter((car) => owns(car.id));
    if (filtro === "faltam") {
      return missingSnapshot
        ? cars.filter((car) => missingSnapshot.has(car.id))
        : cars.filter((car) => !owns(car.id));
    }
    return cars;
  }, [filtro, cars, owns, missingSnapshot]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load("refresh");
    setRefreshing(false);
  }, [load]);

  const showSkeleton = useDelayedFlag(loadState === "loading", 150);

  if (loadState === "not-found") {
    return (
      <ScreenContainer bg="bg" edges={["bottom"]} className="bg-bg">
        <Header variant="stack" title="Série" backFallback="/series" />
        <View className="flex-1 items-center justify-center px-8">
          <EmptyState
            kind="no-content"
            size="lg"
            action={{ label: "Ver todas as séries", onPress: () => router.replace("/series") }}
          />
        </View>
      </ScreenContainer>
    );
  }

  if (loadState === "error") {
    return (
      <ScreenContainer bg="bg" edges={["bottom"]} className="bg-bg">
        <Header variant="stack" title="Série" backFallback="/series" />
        <View className="flex-1 items-center justify-center px-8">
          <ErrorState onRetry={() => load("initial")} />
        </View>
      </ScreenContainer>
    );
  }

  if (loadState === "loading" || !serie) {
    return (
      <ScreenContainer bg="bg" edges={["bottom"]} className="bg-bg">
        <Header variant="stack" title="Série" backFallback="/series" />
        {showSkeleton ? (
          <View>
            <View className="items-center px-4 pt-6 pb-4 gap-3">
              <Skeleton.Rect style={{ width: 96, height: 96 }} />
              <Skeleton.Rect style={{ width: "60%", height: 22 }} />
              <Skeleton.Rect style={{ width: "40%", height: 14 }} />
              <Skeleton.Rect style={{ width: "100%", height: 6 }} />
            </View>
            <CarGridSkeleton />
          </View>
        ) : null}
      </ScreenContainer>
    );
  }

  const percent = percentLabel(ownedCount, total);
  const ownedLine = complete ? (
    <Text variant="body" tone="muted" className="text-center">
      Você tem todas as{" "}
      <Text variant="body" tone="accent" className="font-display-black">
        {total}
      </Text>
    </Text>
  ) : (
    <Text variant="body" tone="muted" className="text-center">
      Você tem{" "}
      <Text variant="body" tone="accent" className="font-display-black">
        {ownedCount}
      </Text>{" "}
      de {total}
    </Text>
  );

  const listHeader = (
    <View className="px-4 pt-6 pb-4">
      <View className="items-center gap-2">
        <CarImage
          uri={serie.imagem || null}
          contentFit="contain"
          bgClassName="bg-bg"
          placeholderScale="80%"
          style={{ width: 96, height: 96 }}
        />
        <Text variant="h1" className="font-display text-center" numberOfLines={2} accessibilityRole="header">
          {serie.title}
        </Text>
        {total > 0 ? (
          <View
            className="w-full items-center gap-2"
            accessible
            accessibilityLabel={`Você tem ${ownedCount} de ${total} miniaturas desta série, ${percent} por cento`}
          >
            {ownedLine}
            <View className="w-full flex-row items-center gap-3">
              <ProgressBar value={ownedCount} max={total} className="flex-1" />
              <Text variant="caption" tone="muted">
                {percent}%
              </Text>
            </View>
            {complete ? (
              <Badge variant="accent" size="sm">
                Série completa
              </Badge>
            ) : null}
          </View>
        ) : null}
        {serie.description ? (
          <Text variant="body-sm" tone="muted" className="text-center" numberOfLines={3}>
            {serie.description}
          </Text>
        ) : null}
      </View>
      {total > 0 ? (
        <SegmentedControl
          className="mt-5"
          options={[
            { value: "todos", label: `Todos ${total}`, accessibilityLabel: `Todos, ${total} miniaturas` },
            {
              value: "colecao",
              label: `Na coleção ${ownedCount}`,
              accessibilityLabel: `Na coleção, ${ownedCount} miniaturas`,
            },
            {
              value: "faltam",
              label: `Faltam ${missingCount}`,
              accessibilityLabel: `Faltam, ${missingCount} miniaturas`,
            },
          ]}
          value={filtro}
          onChange={(next) => router.setParams({ filtro: next })}
          accessibilityLabel="Filtro das miniaturas da série"
        />
      ) : null}
    </View>
  );

  const empty =
    total === 0 ? (
      <View className="px-8 pt-4 items-center">
        <EmptyState kind="no-cars" />
      </View>
    ) : filtro === "colecao" ? (
      <View className="px-8 pt-4 items-center">
        <EmptyState
          kind="no-cars"
          description="Você ainda não tem miniaturas desta série."
          action={{ label: "Ver as que faltam", onPress: () => router.setParams({ filtro: "faltam" }) }}
        />
      </View>
    ) : filtro === "faltam" ? (
      <View className="px-8 pt-4 items-center">
        <EmptyState kind="no-cars" description="Você tem todas as miniaturas desta série." />
      </View>
    ) : null;

  return (
    <ScreenContainer bg="bg" edges={["bottom"]} className="bg-bg">
      <Header variant="stack" title={serie.title} backFallback="/series" />
      <FlashList
        data={visible}
        numColumns={grid.columns}
        keyExtractor={(item) => item.id}
        extraData={collection.items}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={empty}
        refreshControl={
          <RefreshControl tintColor={c("primary")} refreshing={refreshing} onRefresh={refresh} />
        }
        renderItem={({ item, index }) => (
          <View style={grid.cellStyle(index)}>
            <CarCard
              car={item}
              variant="grid"
              width={grid.itemWidth}
              inCollection={owns(item.id)}
              onPress={() => router.push(`/car/${item.id}`)}
              onToggleCollection={() => heart.onToggle(item)}
            />
          </View>
        )}
      />
      {heart.confirmDialog}
    </ScreenContainer>
  );
}
