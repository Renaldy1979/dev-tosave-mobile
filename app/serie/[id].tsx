import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshControl, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { getSerie, listSerieCars, type SerieCarsFilter, type SerieWithCount } from "@/services";
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

const FILTER_API: Record<Filtro, SerieCarsFilter> = { todos: "all", colecao: "owned", faltam: "missing" };
const PAGE = 20;

/**
 * Tela da série (`docs/design/telas/10-series.md` §B): stack com
 * voltar, fora do drawer. Cabeçalho com logo, título, "Você tem X de
 * N" e barra; segmento Todos / Na coleção / Faltam (param `filtro`) e o
 * grid do CarCard igual ao da Home, pela posição na série.
 *
 * Cada segmento é uma consulta paginada no servidor (20 por página, mais
 * ao rolar), e cada carro traz a posse. Um toque no coração atualiza só
 * aquele card e as contagens (sem recarregar): em "Faltam", o carro
 * adicionado continua visível até trocar de segmento ou atualizar.
 */
export default function SerieScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; filtro?: string }>();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { show } = useToast();
  const collection = useCollectionStore();
  const heart = useCollectionHeart();
  const grid = useGridLayout();

  const [serie, setSerie] = useState<SerieWithCount | null>(null);
  const [cars, setCars] = useState<CarListItem[]>([]);
  const [counts, setCounts] = useState({ total: 0, owned: 0, missing: 0 });
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [listLoading, setListLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const filtro = parseFiltro(params.filtro);
  const requestId = useRef(0);

  const qty = useCallback((car: CarListItem) => collection.quantityOf(car), [collection]);

  /** 1ª página do segmento atual (troca de segmento recomeça sem cursor). */
  const loadList = useCallback(async () => {
    if (!params.id) return;
    const id = ++requestId.current;
    const page = await listSerieCars(params.id, { filter: FILTER_API[filtro], pageSize: PAGE });
    if (id !== requestId.current) return;
    setCars(page.items);
    setCounts(page.counts);
    setCursor(page.nextCursor);
  }, [params.id, filtro]);
  // Sempre a versão atual (segmento em vigor) para a carga e o refresh.
  const loadListRef = useRef(loadList);
  loadListRef.current = loadList;

  const load = useCallback(
    async (mode: "initial" | "refresh") => {
      if (!params.id) return;
      if (mode === "initial") setLoadState("loading");
      try {
        const [s] = await Promise.all([getSerie(params.id), loadListRef.current()]);
        if (!s) {
          setLoadState("not-found");
          return;
        }
        setSerie(s);
        setLoadState("ok");
      } catch {
        if (mode === "refresh") show({ type: "danger", message: "Não foi possível atualizar." });
        else setLoadState("error");
      }
    },
    [params.id, show]
  );

  useEffect(() => {
    void load("initial");
  }, [load]);

  // Troca de segmento: recarrega só a lista.
  const firstFilter = useRef(filtro);
  useEffect(() => {
    if (firstFilter.current === filtro) return;
    firstFilter.current = filtro;
    setListLoading(true);
    loadList()
      .catch(() => show({ type: "danger", message: "Não foi possível carregar as miniaturas." }))
      .finally(() => setListLoading(false));
  }, [filtro, loadList, show]);

  const loadMore = useCallback(async () => {
    if (!params.id || !cursor || loadingMore || listLoading) return;
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const page = await listSerieCars(params.id, { filter: FILTER_API[filtro], cursor, pageSize: PAGE });
      if (id !== requestId.current) return;
      setCars((cur) => [...cur, ...page.items]);
      setCursor(page.nextCursor);
    } catch {
      // Mantém o que já está na tela; o próximo fim de rolagem tenta de novo.
    } finally {
      setLoadingMore(false);
    }
  }, [params.id, cursor, loadingMore, listLoading, filtro]);

  // Contagens do servidor + os toques feitos nos cards desta tela.
  const ownedDelta = useMemo(
    () => cars.reduce((sum, car) => sum + (qty(car) > 0 ? 1 : 0) - ((car.quantity ?? 0) > 0 ? 1 : 0), 0),
    [cars, qty]
  );
  const total = counts.total;
  const ownedCount = Math.min(total, Math.max(0, counts.owned + ownedDelta));
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
        data={listLoading ? [] : cars}
        numColumns={grid.columns}
        keyExtractor={(item) => item.id}
        extraData={collection.version}
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listLoading ? <CarGridSkeleton /> : empty}
        refreshControl={
          <RefreshControl tintColor={c("primary")} refreshing={refreshing} onRefresh={refresh} />
        }
        renderItem={({ item, index }) => (
          <View style={grid.cellStyle(index)}>
            <CarCard
              car={item}
              variant="grid"
              width={grid.itemWidth}
              inCollection={qty(item) > 0}
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
