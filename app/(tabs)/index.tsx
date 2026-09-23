import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { getSeriesCarCount, listCarsPaged, listSeries } from "@/services";
import { addToCollection, getCollection, removeFromCollection } from "@/services/collection";
import type { CarListItem, CollectionItemWithCar, Serie } from "@/types";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useDelayedFlag } from "@/hooks/useDelayedFlag";
import { useGridColumns } from "@/hooks/useGridColumns";
import { useRequireSession } from "@/hooks/useRequireSession";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { ThemeScope } from "@/components/ui/ThemeScope";
import { Text } from "@/components/ui/Text";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { SearchBar } from "@/components/ui/SearchBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { CarCard } from "@/components/car/CarCard";
import { CarGridSkeleton } from "@/components/car/CarCardSkeleton";
import { SeriesCard } from "@/components/car/SeriesCard";

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
  const requireSession = useRequireSession();
  const columns = useGridColumns();
  // A TabBar do expo-router tem 56 pt + inset inferior; somamos 24 de respiro.
  const insets = useSafeAreaInsets();
  const bottomPadding = 56 + insets.bottom + 24;

  const [series, setSeries] = useState<Serie[]>([]);
  const [seriesCount, setSeriesCount] = useState<Record<string, number>>({});
  const [seriesState, setSeriesState] = useState<SeriesState>("loading");
  const [seriesError, setSeriesError] = useState<string | null>(null);

  const [cars, setCars] = useState<CarListItem[]>([]);
  const [carsTotal, setCarsTotal] = useState(0);
  const [carsPage, setCarsPage] = useState(1);
  const [gridState, setGridState] = useState<GridState>("loading");
  const [gridError, setGridError] = useState<string | null>(null);

  // Mapa `carId → quantity` para o coração e o badge da TabBar
  // ficarem coerentes sem precisar refazer fetch.
  const [inCollection, setInCollection] = useState<Record<string, boolean>>({});
  const [collectionCount, setCollectionCount] = useState(0);

  const showSeriesSkeleton = useDelayedFlag(seriesState === "loading", 150);
  const showCarsSkeleton = useDelayedFlag(gridState === "loading", 150);

  // ---------- Carga inicial ----------
  const loadSeries = useCallback(async () => {
    setSeriesState("loading");
    setSeriesError(null);
    try {
      const [list, counts] = await Promise.all([
        listSeries({ featured: true }),
        getSeriesCarCount(),
      ]);
      setSeries(list);
      setSeriesCount(counts);
      setSeriesState(list.length === 0 ? "empty" : "ok");
    } catch (err) {
      setSeriesError(err instanceof Error ? err.message : "Erro ao carregar séries.");
      setSeriesState("error");
    }
  }, []);

  const loadCarsPage = useCallback(async (page: number, replace: boolean) => {
    setGridState((prev) => (page === 1 ? "loading" : "loadingMore"));
    setGridError(null);
    try {
      const result = await listCarsPaged({ page, pageSize: PAGE_SIZE });
      setCars((prev) => (replace ? result.items : [...prev, ...result.items]));
      setCarsTotal(result.total);
      setCarsPage(result.page);
      setGridState(result.items.length === 0 ? "empty" : "ok");
    } catch (err) {
      setGridError(err instanceof Error ? err.message : "Erro ao carregar.");
      setGridState("error");
    }
  }, []);

  // Coleção do usuário (apenas para o coração/badge).
  const refreshCollection = useCallback(async () => {
    if (!user) {
      setInCollection({});
      setCollectionCount(0);
      return;
    }
    try {
      const items = await getCollection(user.id);
      const map: Record<string, boolean> = {};
      items.forEach((it: CollectionItemWithCar) => {
        map[it.carId] = it.quantity > 0;
      });
      setInCollection(map);
      setCollectionCount(items.reduce((sum, it) => sum + it.quantity, 0));
    } catch {
      // Falha silenciosa — coração fica desabilitado no card.
    }
  }, [user]);

  useEffect(() => {
    void loadSeries();
    void loadCarsPage(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void refreshCollection();
  }, [refreshCollection]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadSeries(), loadCarsPage(1, true), refreshCollection(), refreshUser()]);
  }, [loadSeries, loadCarsPage, refreshCollection, refreshUser]);

  // ---------- Interações ----------
  const handleEndReached = () => {
    if (gridState !== "ok") return;
    if (cars.length >= carsTotal) return;
    void loadCarsPage(carsPage + 1, false);
  };

  const handleToggleCollection = useCallback(
    async (car: CarListItem) => {
      if (!user) {
        requireSession({ intent: "add", carId: car.id });
        return;
      }
      // Otimista
      setInCollection((prev) => ({ ...prev, [car.id]: !prev[car.id] }));
      setCollectionCount((prev) => prev + (inCollection[car.id] ? -1 : 1));
      try {
        if (inCollection[car.id]) {
          await removeFromCollection(user.id, car.id);
        } else {
          await addToCollection(user.id, car.id);
        }
      } catch {
        // rollback
        setInCollection((prev) => ({ ...prev, [car.id]: !prev[car.id] }));
        setCollectionCount((prev) => prev + (inCollection[car.id] ? 1 : -1));
      }
    },
    [user, requireSession, inCollection]
  );

  const headerFirstName = useMemo(() => {
    if (!user?.name) return null;
    return user.name.split(" ")[0];
  }, [user]);

  // Lista para o FlashList. Cada item é um CarCard; o header é uma
  // faixa ink renderizada via `ListHeaderComponent`.
  const data = cars;

  return (
    <ScreenContainer bg="bg" edges={["bottom"]} className="bg-bg">
      <FlashList
        data={data}
        numColumns={columns}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        refreshControl={
          <RefreshControl
            tintColor={useTheme().c("primary")}
            refreshing={false}
            onRefresh={refreshAll}
          />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.6}
        renderItem={({ item }) => (
          <View style={{ width: `${100 / columns}%`, paddingHorizontal: 4 }}>
            <CarCard
              car={item}
              variant="grid"
              inCollection={Boolean(inCollection[item.id])}
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
            seriesError={seriesError}
            showSeriesSkeleton={showSeriesSkeleton}
            onRetrySeries={loadSeries}
            onSearchPress={() => router.push("/busca?focus=1")}
            onSeriesPress={(id) => router.push(`/busca?serie=${id}`)}
            onAllSeriesPress={() => router.push("/busca")}
            onLoginPress={() => router.push("/login")}
            onAvatarPress={() => router.push("/perfil")}
            collectionCount={collectionCount}
          />
        }
        ListFooterComponent={
          <GridFooter
            state={gridState}
            total={carsTotal}
            loaded={cars.length}
            onRetry={() => loadCarsPage(carsPage + 1, false)}
          />
        }
        ListEmptyComponent={
          showCarsSkeleton ? (
            <View className="px-4 pt-2">
              <CarGridSkeleton numColumns={columns} />
            </View>
          ) : gridState === "empty" ? (
            <EmptyState kind="no-cars" />
          ) : gridState === "error" ? (
            <ErrorState onRetry={() => loadCarsPage(1, true)} />
          ) : null
        }
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
  seriesError: string | null;
  showSeriesSkeleton: boolean;
  onRetrySeries: () => void;
  onSearchPress: () => void;
  onSeriesPress: (id: string) => void;
  onAllSeriesPress: () => void;
  onLoginPress: () => void;
  onAvatarPress: () => void;
  collectionCount: number;
}) {
  const { c } = useTheme();
  return (
    <ThemeScope className="bg-ink">
      <View className="bg-ink px-4 pb-6">
        {/* linha 1: logo + avatar/entrar */}
        <View
          className="flex-row items-center justify-between"
          style={{ paddingTop: 48 }}
        >
          <Logo variant="dark" size="sm" />
          {props.headerFirstName ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Abrir perfil"
              onPress={props.onAvatarPress}
              className="rounded-full items-center justify-center bg-primary-soft"
              style={{ width: 32, height: 32 }}
            >
              <Text variant="body-sm" className="font-display text-primary-text">
                {initials(props.headerFirstName)}
              </Text>
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
            {props.headerFirstName
              ? "O que vamos garimpar hoje?"
              : "O que vamos garimpar hoje?"}
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
                className="flex-row items-center"
              >
                <Text variant="body-sm" tone="primary" className="font-sans-medium">
                  Ver tudo
                </Text>
              </Pressable>
            </View>
            {props.seriesState === "loading" && props.showSeriesSkeleton ? (
              <SeriesRailSkeleton />
            ) : props.seriesState === "error" ? (
              <ErrorState
                size="sm"
                title="Séries indisponíveis"
                description={props.seriesError ?? undefined}
                onRetry={props.onRetrySeries}
              />
            ) : (
              <SeriesRail series={props.series} counts={props.seriesCount} onPress={props.onSeriesPress} />
            )}
          </View>
        ) : null}
      </View>
      {/* linha flame na base da faixa ink */}
      <View className="h-0.5" style={{ backgroundColor: "#FF3838", opacity: 0.3 }} />
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
  return (
    <View>
      <View className="flex-row gap-3">
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
      </View>
    </View>
  );
}

function SeriesRailSkeleton() {
  return (
    <View className="flex-row gap-3">
      {[0, 1].map((i) => (
        <View
          key={i}
          className="rounded-lg bg-white/5"
          style={{ width: 280, height: 160 }}
        >
          <Skeleton.Rect style={{ height: 14, width: 70, margin: 12 }} />
        </View>
      ))}
    </View>
  );
}

function GridFooter({
  state,
  total,
  loaded,
  onRetry,
}: {
  state: GridState;
  total: number;
  loaded: number;
  onRetry: () => void;
}) {
  const { c } = useTheme();
  if (state === "loading" || state === "empty") return null;
  if (loaded >= total) {
    return (
      <Text variant="caption" tone="subtle" className="text-center mt-6 mb-2">
        Você viu tudo.
      </Text>
    );
  }
  if (state === "loadingMore") {
    return (
      <View className="items-center py-4">
        <ActivityIndicator color={c("primary")} size="small" />
      </View>
    );
  }
  if (state === "error") {
    return (
      <View className="items-center gap-2 py-4">
        <Text variant="caption" tone="danger">
          Não foi possível carregar mais.
        </Text>
        <Button label="Tentar novamente" variant="outline" size="sm" onPress={onRetry} />
      </View>
    );
  }
  return null;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
