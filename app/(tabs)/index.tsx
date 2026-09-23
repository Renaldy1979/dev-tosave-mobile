import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { getSeriesCarCount, listCarsPaged, listSeries } from "@/services";
import type { CarListItem, Serie } from "@/types";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useDelayedFlag } from "@/hooks/useDelayedFlag";
import { useGridLayout } from "@/hooks/useGridColumns";
import { useCollectionStore } from "@/hooks/useCollectionStore";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { ThemeScope } from "@/components/ui/ThemeScope";
import { Text } from "@/components/ui/Text";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { SearchBar } from "@/components/ui/SearchBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Avatar, deriveAvatarInitials } from "@/components/ui/Avatar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CarCard } from "@/components/car/CarCard";
import { CarGridSkeleton } from "@/components/car/CarCardSkeleton";
import { SeriesCard } from "@/components/car/SeriesCard";
import { useToast } from "@/components/ui/Toast";

const PAGE_SIZE = 20;

type SeriesState = "loading" | "ok" | "error" | "empty";
type GridState = "loading" | "ok" | "error" | "empty" | "loadingMore";

/**
 * Home (`docs/design/telas/03-home.md`).
 *
 * Faixa ink superior (logo + avatar/entrar + saudação + busca
 * rápida) sobreposta ao conteúdo claro/escuro do tema. Carrossel
 * de séries em destaque + grid 2 colunas com paginação infinita.
 */
export default function Home() {
  const router = useRouter();
  const { user, refresh: refreshUser } = useCurrentUser();
  const collection = useCollectionStore();
  const { show } = useToast();
  const grid = useGridLayout();
  // A TabBar do expo-router tem 56 pt + inset inferior; somamos 24 de respiro.
  const insets = useSafeAreaInsets();
  const bottomPadding = 56 + insets.bottom + 24;

  const [series, setSeries] = useState<Serie[]>([]);
  const [seriesCount, setSeriesCount] = useState<Record<string, number>>({});
  const [seriesState, setSeriesState] = useState<SeriesState>("loading");

  const [cars, setCars] = useState<CarListItem[]>([]);
  const [carsTotal, setCarsTotal] = useState(0);
  const [carsCursor, setCarsCursor] = useState<string | null>(null);
  const [gridState, setGridState] = useState<GridState>("loading");
  const [gridError, setGridError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<CarListItem | null>(null);

  const showSeriesSkeleton = useDelayedFlag(seriesState === "loading", 150);
  const showCarsSkeleton = useDelayedFlag(gridState === "loading", 150);

  // ---------- Carga inicial ----------
  const loadSeries = useCallback(async () => {
    setSeriesState("loading");
    try {
      const [list, counts] = await Promise.all([
        listSeries({ featured: true }),
        getSeriesCarCount(),
      ]);
      setSeries(list);
      setSeriesCount(counts);
      setSeriesState(list.length === 0 ? "empty" : "ok");
    } catch {
      setSeriesState("error");
    }
  }, []);

  const loadCarsPage = useCallback(
    async (cursor: string | null, replace: boolean) => {
      setGridState((prev) => (cursor === null ? "loading" : "loadingMore"));
      setGridError(null);
      try {
        const result = await listCarsPaged({
          cursor: cursor ?? undefined,
          pageSize: PAGE_SIZE,
        });
        setCars((prev) => (replace ? result.items : [...prev, ...result.items]));
        setCarsTotal(result.total ?? 0);
        setCarsCursor(result.nextCursor);
        setGridState(result.items.length === 0 ? "empty" : "ok");
      } catch (err) {
        setGridError(err instanceof Error ? err.message : "Erro ao carregar.");
        setGridState("error");
      }
    },
    []
  );

  useEffect(() => {
    void loadSeries();
    void loadCarsPage(null, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadSeries(),
        loadCarsPage(null, true),
        collection.refresh(),
        refreshUser(),
      ]);
    } catch {
      show({ type: "danger", message: "Não foi possível atualizar." });
    } finally {
      setRefreshing(false);
    }
  }, [loadSeries, loadCarsPage, collection, refreshUser, show]);

  // ---------- Interações ----------
  const handleEndReached = () => {
    if (gridState !== "ok") return;
    if (!carsCursor) return;
    void loadCarsPage(carsCursor, false);
  };

  const handleToggleCollection = useCallback(
    async (car: CarListItem) => {
      const wasIn = (collection.items[car.id] ?? 0) > 0;
      const currentQty = collection.items[car.id] ?? 0;
      // Se vai remover e quantity > 1, pede confirmação antes.
      if (wasIn && currentQty > 1) {
        setConfirmRemove(car);
        return;
      }
      try {
        await collection.toggle(car.id);
        if (!wasIn) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
          show({
            type: "success",
            message: "Adicionada à sua coleção.",
            action: { label: "Ver", onPress: () => router.navigate("/colecao") },
          });
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
        }
      } catch {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
        show({ type: "danger", message: "Não foi possível atualizar sua coleção." });
      }
    },
    [collection, show, router]
  );

  const handleConfirmRemoveAll = useCallback(async () => {
    if (!confirmRemove) return;
    const car = confirmRemove;
    const previousQty = collection.items[car.id] ?? 0;
    setConfirmRemove(null);
    try {
      await collection.remove(car.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
      show({
        type: "info",
        message: `Removidas ${previousQty} unidades da sua coleção.`,
        action: {
          label: "Desfazer",
          onPress: () => collection.setQuantity(car.id, previousQty).catch(() => undefined),
        },
      });
    } catch {
      show({ type: "danger", message: "Não foi possível atualizar sua coleção." });
    }
  }, [confirmRemove, collection, show]);

  const headerFirstName = useMemo(() => {
    if (!user?.name) return null;
    return user.name.split(" ")[0];
  }, [user]);

  const data = cars;
  const collectionCount = collection.summary.totalItems;

  return (
    <ScreenContainer bg="bg" edges={["bottom"]} statusBar="light" className="bg-bg">
      <FlashList
        data={data}
        numColumns={grid.columns}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        refreshControl={
          <RefreshControl
            tintColor={useTheme().c("primary")}
            refreshing={refreshing}
            onRefresh={refreshAll}
          />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.6}
        renderItem={({ item, index }) => (
          <View style={grid.cellStyle(index)}>
            <CarCard
              car={item}
              variant="grid"
              width={grid.itemWidth}
              inCollection={(collection.items[item.id] ?? 0) > 0}
              onPress={() => router.push(`/car/${item.id}`)}
              onToggleCollection={() => handleToggleCollection(item)}
            />
          </View>
        )}
        ListHeaderComponent={
          <HomeHeader
            headerFirstName={headerFirstName}
            seriesState={seriesState}
            series={series}
            seriesCount={seriesCount}
            onRetrySeries={loadSeries}
            onSearchPress={() => router.push("/busca?focus=1")}
            onSeriesPress={(id) => router.push(`/busca?serie=${id}`)}
            onAllSeriesPress={() => router.push("/busca?open=serie")}
            onLoginPress={() => router.push("/login")}
            onAvatarPress={() => router.push("/perfil")}
            collectionCount={collectionCount}
            showSeriesSkeleton={showSeriesSkeleton}
          />
        }
        ListFooterComponent={
          <GridFooter
            state={gridState}
            total={carsTotal}
            loaded={cars.length}
            error={gridError}
            onRetry={() => loadCarsPage(carsCursor, false)}
          />
        }
        ListEmptyComponent={
          showCarsSkeleton ? (
            <View className="pt-2">
              <CarGridSkeleton />
            </View>
          ) : gridState === "empty" ? (
            <EmptyState kind="no-cars" />
          ) : gridState === "error" ? (
            <ErrorState onRetry={() => loadCarsPage(null, true)} />
          ) : null
        }
      />
      <ConfirmDialog
        open={confirmRemove !== null}
        onClose={() => setConfirmRemove(null)}
        title={`Remover todas as ${collection.items[confirmRemove?.id ?? ""] ?? 0} unidades?`}
        description={
          confirmRemove
            ? `${confirmRemove.title} sai completamente da sua coleção.`
            : undefined
        }
        onConfirm={handleConfirmRemoveAll}
      />
    </ScreenContainer>
  );
}

/* ================================================================== */
/*                          HEADER (faixa ink)                        */
/* ================================================================== */

function HomeHeader(props: {
  headerFirstName: string | null;
  seriesState: SeriesState;
  series: Serie[];
  seriesCount: Record<string, number>;
  onRetrySeries: () => void;
  onSearchPress: () => void;
  onSeriesPress: (id: string) => void;
  onAllSeriesPress: () => void;
  onLoginPress: () => void;
  onAvatarPress: () => void;
  collectionCount: number;
  showSeriesSkeleton: boolean;
}) {
  const { c } = useTheme();
  const { user } = useCurrentUser();
  return (
    <ThemeScope className="bg-ink">
      <View className="bg-ink px-4 pb-6">
        {/* linha 1: logo + avatar/entrar */}
        <View
          className="flex-row items-center justify-between"
          style={{ paddingTop: 48 }}
        >
          <Logo variant="dark" size="sm" />
          {user ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir perfil"
              onPress={props.onAvatarPress}
              hitSlop={12}
              className="items-center justify-center"
              style={{ width: 44, height: 44 }}
            >
              <Avatar initials={deriveAvatarInitials(user.name)} size={32} />
            </Pressable>
          ) : (
            <Button
              label="Entrar"
              variant="ghost"
              size="sm"
              onPress={props.onLoginPress}
              className="active:bg-white/10"
              accessibilityLabel="Entrar na sua conta"
            />
          )}
        </View>

        {/* saudação */}
        <View className="mt-4">
          {props.headerFirstName ? (
            <Text variant="body-sm" tone="ink" className="text-ink-fg/60">
              Olá, {props.headerFirstName}
            </Text>
          ) : null}
          <Text variant="h2" tone="ink" className="text-ink-fg mt-0.5">
            O que vamos garimpar hoje?
          </Text>
        </View>

        {/* busca rápida (trigger) */}
        <View className="mt-3">
          <SearchBar
            value=""
            onChangeText={() => undefined}
            mode="trigger"
            surface="ink"
            onPressTrigger={props.onSearchPress}
            placeholder="Buscar por nome ou código"
          />
        </View>

        {/* séries em destaque */}
        {props.seriesState !== "empty" ? (
          <View className="mt-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text variant="eyebrow" tone="ink" className="text-ink-fg/60">
                SÉRIES EM DESTAQUE
              </Text>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Ver todas as séries"
                onPress={props.onAllSeriesPress}
                hitSlop={12}
                style={{ minHeight: 44, minWidth: 44 }}
                className="flex-row items-center pl-3 active:opacity-70"
              >
                <Text variant="body-sm" tone="primary" className="font-sans-medium">
                  Ver tudo
                </Text>
                <ChevronRight color={c("primary-text")} size={16} strokeWidth={1.75} />
              </Pressable>
            </View>
            {props.seriesState === "loading" ? (
              // Durante o loading, mostra skeleton só depois do atraso
              // de 150 ms. Antes disso, reserva o espaço com `null` para
              // não piscar o SeriesRail vazio.
              props.showSeriesSkeleton ? <SeriesRailSkeleton /> : null
            ) : props.seriesState === "error" ? (
              <ErrorState
                size="sm"
                title="Séries indisponíveis"
                onRetry={props.onRetrySeries}
              />
            ) : props.seriesState === "ok" && props.series.length > 0 ? (
              <SeriesRail series={props.series} counts={props.seriesCount} onPress={props.onSeriesPress} />
            ) : null}
          </View>
        ) : null}

        {/* contador + primeira dobra */}
        <View className="mt-6 px-1 flex-row items-baseline justify-between">
          <Text variant="eyebrow" tone="subtle">
            MINIATURAS
          </Text>
          <Text variant="caption" tone="muted">
            {props.collectionCount} {props.collectionCount === 1 ? "na coleção" : "na sua coleção"}
          </Text>
        </View>
      </View>
      {/* linha flame na base da faixa ink */}
      <View
        className="h-0.5"
        style={{
          backgroundColor: c("flame"),
          opacity: 0.3,
        }}
      />
    </ThemeScope>
  );
}

/* ================================================================== */
/*                          COMPONENTES DE APOIO                      */
/* ================================================================== */

function SeriesRail({
  series,
  counts,
  onPress,
}: {
  series: Serie[];
  counts: Record<string, number>;
  onPress: (id: string) => void;
}) {
  // Lista vazia: não renderiza nada (a HomeHeader cuida do estado
  // vazio separadamente, antes de chegar aqui).
  if (series.length === 0) return null;
  const isSingle = series.length === 1;
  if (isSingle) {
    const only = series[0];
    return (
      <View className="px-4">
        <SeriesCard
          id={only.id}
          title={only.title}
          description={only.description}
          image={only.imagem}
          carCount={counts[only.id] ?? 0}
          onPress={() => onPress(only.id)}
        />
      </View>
    );
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={292}
      decelerationRate="fast"
      contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
    >
      {series.map((s) => (
        <SeriesCard
          key={s.id}
          id={s.id}
          title={s.title}
          description={s.description}
          image={s.imagem}
          carCount={counts[s.id] ?? 0}
          onPress={() => onPress(s.id)}
        />
      ))}
    </ScrollView>
  );
}

function SeriesRailSkeleton() {
  const { c } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
    >
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          className="rounded-lg border border-white/5"
          style={{ width: 280, height: 160, backgroundColor: c("surface-3"), opacity: 0.6 }}
        />
      ))}
    </ScrollView>
  );
}

function GridFooter({
  state,
  total,
  loaded,
  error,
  onRetry,
}: {
  state: GridState;
  total: number;
  loaded: number;
  error?: string | null;
  onRetry: () => void;
}) {
  const { c } = useTheme();
  if (state === "loading" || state === "empty") return null;
  if (state === "loadingMore") {
    return (
      <View>
        <CarGridSkeleton rows={1} />
        <View className="items-center py-3">
          <ActivityIndicator color={c("primary")} size="small" />
        </View>
      </View>
    );
  }
  if (state === "error") {
    return (
      <View className="items-center gap-2 py-4">
        <Text variant="caption" tone="danger">
          {error ?? "Não foi possível carregar mais."}
        </Text>
        <Button label="Tentar novamente" variant="outline" size="sm" onPress={onRetry} />
      </View>
    );
  }
  if (loaded >= total) {
    return (
      <Text variant="caption" tone="subtle" className="text-center mt-6 mb-2">
        Você viu tudo.
      </Text>
    );
  }
  return null;
}
