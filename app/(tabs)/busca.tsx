import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  TextInput,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Badge } from "@/components/ui/Badge";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
// useCurrentUser removido da Busca na fase 2 (app travado).
import { useDelayedFlag } from "@/hooks/useDelayedFlag";
import { useGridLayout } from "@/hooks/useGridColumns";
import { useCollectionStore } from "@/hooks/useCollectionStore";
import {
  countCars,
  listAttributes,
  listBrands,
  listCars,
  listCarsPaged,
  listSeries,
  listYears,
} from "@/services";
import type {
  Attribute,
  Brand,
  CarFilters,
  CarListItem,
  Serie,
} from "@/types";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Text } from "@/components/ui/Text";
import { Header } from "@/components/ui/Header";
import { SearchBar } from "@/components/ui/SearchBar";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { CarCard } from "@/components/car/CarCard";
import { CarGridSkeleton } from "@/components/car/CarCardSkeleton";
import { FilterChipsRow } from "@/components/ui/FilterChipsRow";
import { FilterSheet, type FilterDraft } from "@/components/ui/FilterSheet";
// useRequireSession removido na fase 2 (app travado).
import { useToast } from "@/components/ui/Toast";

const PAGE_SIZE = 20;

/**
 * Tela de Busca e filtros (`docs/design/telas/04-busca-filtros.md`).
 *
 * Componentes:
 * - Header large (título "Buscar" colapsa ao rolar).
 * - SearchBar sticky com debounce de 300 ms.
 * - FilterChipsRow com dimensões (Ano, Série, Marca, Atributos).
 * - FilterSheet para edições.
 * - Estado inicial: Buscas recentes (mock) + Explorar por série/marca.
 * - Resultados: FlashList 2 colunas com paginação infinita.
 */
export default function Busca() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    q?: string;
    year?: string;
    serie?: string;
    brand?: string;
    attr?: string;
    focus?: string;
    open?: string;
  }>();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  // `user` não é checado aqui — a Busca fica dentro do grupo (tabs),
  // protegido pelo Stack, então user está sempre presente.
  const { show } = useToast();
  const grid = useGridLayout();

  // ----- Estado de busca -----
  const [term, setTerm] = useState<string>(params.q ?? "");
  const [debouncedTerm, setDebouncedTerm] = useState<string>(term);
  // Debounce do termo
  useEffect(() => {
    const id = setTimeout(() => setDebouncedTerm(term), 300);
    return () => clearTimeout(id);
  }, [term]);

  const filters = useMemo<CarFilters>(() => {
    const f: CarFilters = {};
    if (debouncedTerm.trim().length > 0) f.q = debouncedTerm.trim();
    const yearList = (params.year ?? "")
      .split(",")
      .map((s) => parseInt(s, 10))
      .filter((n) => !Number.isNaN(n));
    if (yearList.length > 0) f.years = yearList;
    if (params.serie) f.serieId = params.serie;
    if (params.brand) f.brandId = params.brand;
    const attrList = (params.attr ?? "")
      .split(",")
      .filter(Boolean);
    if (attrList.length > 0) f.attributeIds = attrList;
    return f;
  }, [debouncedTerm, params.year, params.serie, params.brand, params.attr]);

  // ----- Header scrollY -----
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  // ----- Resultados -----
  const [items, setItems] = useState<CarListItem[]>([]);
  const [gridState, setGridState] = useState<"loading" | "ok" | "error" | "empty">("loading");
  const [exactToyMatch, setExactToyMatch] = useState<CarListItem | null>(null);
  // `showAll` é ligado pelo botão "Todas as miniaturas" do estado
  // inicial — sem termo e sem filtro, força o grid a aparecer
  // (item 6 da revisão).
  const [showAll, setShowAll] = useState(false);
  const showSkeleton = useDelayedFlag(gridState === "loading", 150);
  const showResults =
    term.trim().length > 0 || hasActiveFilter(filters) || showAll;

  // ----- Opções de filtro -----
  const [years, setYears] = useState<number[]>([]);
  const [series, setSeries] = useState<Serie[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [optionsState, setOptionsState] = useState<{
    years: LoadState;
    series: LoadState;
    brands: LoadState;
    attributes: LoadState;
  }>({ years: "loading", series: "loading", brands: "loading", attributes: "loading" });

  const loadOptions = useCallback(async () => {
    setOptionsState({ years: "loading", series: "loading", brands: "loading", attributes: "loading" });
    try {
      const [y, s, b, a] = await Promise.all([
        listYears(),
        listSeries(),
        listBrands(),
        listAttributes(),
      ]);
      setYears(y);
      setSeries(s);
      setBrands(b);
      setAttributes(a);
      setOptionsState({
        years: y.length === 0 ? "empty" : "ok",
        series: s.length === 0 ? "empty" : "ok",
        brands: b.length === 0 ? "empty" : "ok",
        attributes: a.length === 0 ? "empty" : "ok",
      });
    } catch {
      setOptionsState({
        years: "error",
        series: "error",
        brands: "error",
        attributes: "error",
      });
    }
  }, []);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  // ----- Carga dos resultados -----
  const [cursor, setCursor] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);

  const loadResults = useCallback(
    async (cursorToLoad: string | null, replace: boolean) => {
      setGridState((prev) => (cursorToLoad === null ? "loading" : "ok"));
      try {
        const result = await listCarsPaged({
          ...filters,
          cursor: cursorToLoad ?? undefined,
          pageSize: PAGE_SIZE,
        });
        setItems((prev) => (replace ? result.items : [...prev, ...result.items]));
        setTotal(result.total ?? 0);
        setCursor(result.nextCursor);
        setGridState(result.items.length === 0 ? "empty" : "ok");
      } catch {
        setGridState("error");
      }
    },
    [filters]
  );

  useEffect(() => {
    void loadResults(null, true);
  }, [loadResults]);

  // ----- Exact toy match -----
  useEffect(() => {
    const termTrim = term.trim();
    if (!termTrim) {
      setExactToyMatch(null);
      return;
    }
    const cleaned = termTrim.replace(/^#/, "");
    const isExact =
      cleaned.length >= 4 && /^[a-z0-9]+$/i.test(cleaned);
    if (!isExact) {
      setExactToyMatch(null);
      return;
    }
    void listCars({ q: cleaned })
      .then((cars) => {
        const exact = cars.find(
          (c) => c.toy.toLowerCase() === cleaned.toLowerCase()
        );
        if (exact) {
          setExactToyMatch({
            ...exact,
            brandName: brands.find((b) => b.id === exact.brandId)?.name ?? "",
            serieTitle: series.find((s) => s.id === exact.serieId)?.title ?? "",
          });
        } else {
          setExactToyMatch(null);
        }
      })
      .catch(() => setExactToyMatch(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, brands, series]);

  // ----- Coleção (store compartilhado) -----
  const collection = useCollectionStore();
  const isInCollection = (carId: string) => (collection.items[carId] ?? 0) > 0;

  // ----- Filtro sheet -----
  const [filterOpen, setFilterOpen] = useState(false);
  const [draft, setDraft] = useState<FilterDraft>(() => fromParams(params));

  // Ref para o TextInput do SearchBar (focus imperativo).
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (params.open === "serie" || params.open === "brand" || params.open === "year" || params.open === "attr") {
      setFilterOpen(true);
    }
  }, [params.open]);

  // Foco do campo quando o usuário vem da Home com `focus=1` (item 3
  // desta rodada — funciona com a tab já montada). `useFocusEffect`
  // dispara cada vez que a tela recebe foco, inclusive ao voltar para
  // a tab Buscar. Após focar, limpa o param `focus` para não refocar
  // ao voltar à tela sem ter vindo da Home.
  useFocusEffect(
    useCallback(() => {
      if (params.focus === "1") {
        const t = setTimeout(() => {
          searchInputRef.current?.focus();
          // Limpa o param para que toques futuros na tab não refocem.
          router.setParams({ focus: undefined });
        }, 100);
        return () => clearTimeout(t);
      }
      return undefined;
    }, [params.focus, router])
  );

  // Sincroniza o rascunho com os params ao abrir
  useEffect(() => {
    setDraft(fromParams(params));
  }, [params.year, params.serie, params.brand, params.attr]);

  const handleApply = (next: FilterDraft) => {
    Haptics.selectionAsync().catch(() => undefined);
    router.setParams({
      year: next.years.length > 0 ? next.years.join(",") : undefined,
      serie: next.serieId ?? undefined,
      brand: next.brandId ?? undefined,
      attr: next.attributeIds.length > 0 ? next.attributeIds.join(",") : undefined,
    });
  };

  const handleClear = () => {
    setShowAll(false);
    setTerm("");
    router.setParams({
      q: undefined,
      year: undefined,
      serie: undefined,
      brand: undefined,
      attr: undefined,
    });
  };

  const handleLiveCount = useCallback(
    (next: FilterDraft, onResult: (n: number) => void) => {
      const candidate: CarFilters = {};
      if (debouncedTerm.trim()) candidate.q = debouncedTerm.trim();
      if (next.years.length > 0) candidate.years = next.years;
      if (next.serieId) candidate.serieId = next.serieId;
      if (next.brandId) candidate.brandId = next.brandId;
      if (next.attributeIds.length > 0) candidate.attributeIds = next.attributeIds;
      // Em erro, callback nunca dispara → o sheet fica em "Ver resultados".
      countCars(candidate).then(onResult).catch(() => undefined);
    },
    [debouncedTerm]
  );

  // ----- Ações -----
  const handleEndReached = () => {
    if (gridState !== "ok") return;
    if (!cursor) return;
    void loadResults(cursor, false);
  };

  const handleToggleCollection = useCallback(
    async (car: CarListItem) => {
      try {
        await collection.toggle(car.id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      } catch {
        show({ type: "danger", message: "Não foi possível atualizar sua coleção." });
      }
    },
    [collection, show]
  );

  // ----- Chips para FilterChipsRow -----
  const activeFiltersCount =
    (filters.years?.length ?? 0) > 0 ? 1 : 0 +
    (filters.serieId ? 1 : 0) +
    (filters.brandId ? 1 : 0) +
    (filters.attributeIds?.length ?? 0);

  const chipItems = useMemo(() => {
    const out: Array<{
      key: string;
      label: string;
      count?: number;
      selected?: boolean;
      kind: "dropdown" | "removable";
      onPress: () => void;
      accessibilityLabel?: string;
    }> = [];

    if ((filters.years?.length ?? 0) > 0) {
      const yearsLabel = (filters.years ?? []).join(", ");
      out.push({
        key: "year",
        label: `Ano: ${yearsLabel}`,
        kind: "removable",
        onPress: () => router.setParams({ year: undefined }),
        accessibilityLabel: `Remover filtro Ano ${yearsLabel}`,
      });
    } else {
      out.push({
        key: "year",
        label: "Ano",
        kind: "dropdown",
        onPress: () => setFilterOpen(true),
        accessibilityLabel: "Abrir filtro de Ano",
      });
    }

    if (filters.serieId) {
      const title = series.find((s) => s.id === filters.serieId)?.title ?? "—";
      out.push({
        key: "serie",
        label: `Série: ${title}`,
        kind: "removable",
        onPress: () => router.setParams({ serie: undefined }),
        accessibilityLabel: `Remover filtro Série ${title}`,
      });
    } else {
      out.push({
        key: "serie",
        label: "Série",
        kind: "dropdown",
        onPress: () => setFilterOpen(true),
        accessibilityLabel: "Abrir filtro de Série",
      });
    }

    if (filters.brandId) {
      const name = brands.find((b) => b.id === filters.brandId)?.name ?? "—";
      out.push({
        key: "brand",
        label: `Marca: ${name}`,
        kind: "removable",
        onPress: () => router.setParams({ brand: undefined }),
        accessibilityLabel: `Remover filtro Marca ${name}`,
      });
    } else {
      out.push({
        key: "brand",
        label: "Marca",
        kind: "dropdown",
        onPress: () => setFilterOpen(true),
        accessibilityLabel: "Abrir filtro de Marca",
      });
    }

    if ((filters.attributeIds?.length ?? 0) > 0) {
      out.push({
        key: "attr",
        label: `Atributos · ${filters.attributeIds?.length ?? 0}`,
        count: filters.attributeIds?.length ?? 0,
        kind: "removable",
        onPress: () => router.setParams({ attr: undefined }),
        accessibilityLabel: "Remover filtro Atributos",
      });
    } else {
      out.push({
        key: "attr",
        label: "Atributos",
        kind: "dropdown",
        onPress: () => setFilterOpen(true),
        accessibilityLabel: "Abrir filtro de Atributos",
      });
    }

    return out;
  }, [filters, series, brands, router]);

  const activeFiltersTotal =
    (filters.years?.length ?? 0) +
    (filters.serieId ? 1 : 0) +
    (filters.brandId ? 1 : 0) +
    (filters.attributeIds?.length ?? 0);

  const bottomPadding = 56 + insets.bottom + 24;

  return (
    <ScreenContainer bg="bg" edges={["bottom"]} className="bg-bg">
      <Header
        variant="large"
        title="Buscar"
        scrollY={scrollY}
      />

      {/* Uma única FlashList com ListHeaderComponent (header da tela) +
          ListFooterComponent (loading/empty/error/grid footer). A
          virtualização só funciona fora de ScrollView/Animated.ScrollView
          (item 7 da revisão). */}
      {!showResults ? (
        <Animated.ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: bottomPadding }}
          refreshControl={
            <RefreshControl
              tintColor={c("primary")}
              refreshing={false}
              onRefresh={() => loadResults(null, true)}
            />
          }
        >
          {/* SearchBar */}
          <View className="px-4 mt-2">
            <SearchBar
              ref={searchInputRef}
              value={term}
              onChangeText={setTerm}
              placeholder="Buscar por nome ou código"
              autoFocus={params.focus === "1"}
              onSubmit={() => {
                if (term.trim().length >= 2) {
                  router.setParams({ q: term.trim() });
                }
              }}
            />
          </View>

          {/* Chips de filtro */}
          <View className="mt-3">
            <FilterChipsRow
              activeFiltersCount={activeFiltersTotal}
              onOpenFilters={() => setFilterOpen(true)}
              items={chipItems}
              onClear={activeFiltersTotal > 0 ? handleClear : undefined}
            />
          </View>

          {/* Estado inicial (sem termo e sem filtro) */}
          <InitialExplore
            series={series}
            brands={brands}
            seriesState={optionsState.series}
            brandsState={optionsState.brands}
            onSelectSerie={(id) => router.setParams({ serie: id })}
            onSelectBrand={(id) => router.setParams({ brand: id })}
            onShowAll={() => {
              setShowAll(true);
              void loadResults(null, true);
            }}
          />
        </Animated.ScrollView>
      ) : (
        <FlashList
          data={items}
          numColumns={grid.columns}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: bottomPadding }}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.6}
          refreshControl={
            <RefreshControl
              tintColor={c("primary")}
              refreshing={false}
              onRefresh={() => loadResults(null, true)}
            />
          }
          ListHeaderComponent={
            <View>
              {/* SearchBar */}
              <View className="px-4 mt-2">
                <SearchBar
                  ref={searchInputRef}
                  value={term}
                  onChangeText={setTerm}
                  placeholder="Buscar por nome ou código"
                  autoFocus={params.focus === "1"}
                  onSubmit={() => {
                    if (term.trim().length >= 2) {
                      router.setParams({ q: term.trim() });
                    }
                  }}
                />
              </View>

              {/* Chips de filtro */}
              <View className="mt-3">
                <FilterChipsRow
                  activeFiltersCount={activeFiltersTotal}
                  onOpenFilters={() => setFilterOpen(true)}
                  items={chipItems}
                  onClear={activeFiltersTotal > 0 ? handleClear : undefined}
                />
              </View>

              {/* Contagem */}
              <View className="px-4 mt-4">
                {gridState === "loading" ? (
                  <Skeleton.Rect style={{ width: 120, height: 14 }} />
                ) : (
                  <Text variant="body-sm" tone="muted" accessibilityLiveRegion="polite">
                    {total === 0
                      ? "Nenhum resultado"
                      : `${total} ${total === 1 ? "miniatura" : "miniaturas"}`}
                  </Text>
                )}
              </View>

              {/* Exact toy match (row destacada) */}
              {exactToyMatch ? (
                <View className="px-4 mt-2">
                  <View className="flex-row items-center mb-1.5">
                    <BadgeInline tone="primary">Código exato</BadgeInline>
                  </View>
                  <CarCard
                    car={exactToyMatch}
                    variant="row"
                    inCollection={isInCollection(exactToyMatch.id)}
                    onPress={() => router.push(`/car/${exactToyMatch.id}`)}
                    onToggleCollection={() => handleToggleCollection(exactToyMatch)}
                  />
                </View>
              ) : null}
            </View>
          }
          renderItem={({ item, index }) => (
            <View style={grid.cellStyle(index)}>
              <CarCard
                car={item}
                variant="grid"
                width={grid.itemWidth}
                inCollection={isInCollection(item.id)}
                onPress={() => router.push(`/car/${item.id}`)}
                onToggleCollection={() => handleToggleCollection(item)}
              />
            </View>
          )}
          ListFooterComponent={
            <ResultsFooter
              state={gridState}
              showSkeleton={showSkeleton}
              total={total}
              loaded={items.length}
              hasFilters={activeFiltersTotal > 0 || term.trim().length > 0}
              onRetry={() => loadResults(null, true)}
              onClear={() => {
                setTerm("");
                handleClear();
              }}
            />
          }
        />
      )}

      <FilterSheet
        open={filterOpen}
        onClose={() => {
          setFilterOpen(false);
          // Limpa o param `open` para que voltar à tab não reabra o sheet.
          router.setParams({ open: undefined });
        }}
        draft={draft}
        onApply={handleApply}
        onClear={() => {
          handleClear();
          setDraft({ years: [], serieId: null, brandId: null, attributeIds: [] });
        }}
        data={{ years, series, brands, attributes }}
        dataState={optionsState}
        onRetryLoad={loadOptions}
        liveCount={handleLiveCount}
        initialSection={
          params.open === "serie"
            ? "serie"
            : params.open === "brand"
              ? "brand"
              : params.open === "year"
                ? "year"
                : params.open === "attr"
                  ? "attr"
                  : undefined
        }
      />
    </ScreenContainer>
  );
}

type LoadState = "loading" | "ok" | "error" | "empty";

function hasActiveFilter(filters: CarFilters): boolean {
  return Boolean(
    filters.q ||
      (filters.years?.length ?? 0) > 0 ||
      filters.serieId ||
      filters.brandId ||
      (filters.attributeIds?.length ?? 0) > 0
  );
}

function fromParams(params: {
  year?: string;
  serie?: string;
  brand?: string;
  attr?: string;
}): FilterDraft {
  const years = (params.year ?? "")
    .split(",")
    .map((s) => parseInt(s, 10))
    .filter((n) => !Number.isNaN(n));
  const attributeIds = (params.attr ?? "")
    .split(",")
    .filter(Boolean);
  return {
    years,
    serieId: params.serie ?? null,
    brandId: params.brand ?? null,
    attributeIds,
    duplicatesOnly: false,
  };
}

/* ================================================================== */
/*                          SUB-COMPONENTES                            */
/* ================================================================== */

function InitialExplore({
  series,
  brands,
  seriesState,
  brandsState,
  onSelectSerie,
  onSelectBrand,
  onShowAll,
}: {
  series: Serie[];
  brands: Brand[];
  seriesState: LoadState;
  brandsState: LoadState;
  onSelectSerie: (id: string) => void;
  onSelectBrand: (id: string) => void;
  onShowAll: () => void;
}) {
  const { c } = useTheme();
  return (
    <View className="mt-6">
      {/* Explorar por série */}
      <Text variant="eyebrow" tone="subtle" className="px-4 mb-2">
        EXPLORAR POR SÉRIE
      </Text>
      {seriesState === "loading" ? (
        <View className="flex-row flex-wrap gap-2 px-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton.Rect
              key={i}
              style={{ width: 100 + (i % 3) * 30, height: 36 }}
            />
          ))}
        </View>
      ) : seriesState === "empty" || series.length === 0 ? null : (
        <View className="flex-row flex-wrap gap-2 px-4">
          {series.slice(0, 8).map((serie) => (
            <Pressable
              key={serie.id}
              accessibilityRole="button"
              accessibilityLabel={`Filtrar por série ${serie.title}`}
              onPress={() => onSelectSerie(serie.id)}
              hitSlop={6}
              className="rounded-sm px-3 h-11 items-center justify-center bg-surface border border-border-strong active:opacity-90"
            >
              <Text variant="body-sm" numberOfLines={1}>
                {serie.title}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Explorar por marca */}
      <Text variant="eyebrow" tone="subtle" className="px-4 mt-6 mb-2">
        EXPLORAR POR MARCA
      </Text>
      {brandsState === "loading" ? (
        <View className="flex-row flex-wrap gap-2 px-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton.Rect
              key={i}
              style={{ width: 80 + (i % 2) * 40, height: 36 }}
            />
          ))}
        </View>
      ) : brandsState === "empty" || brands.length === 0 ? null : (
        <View className="flex-row flex-wrap gap-2 px-4">
          {brands
            .filter((b) => b.active || b.state !== "em_analise")
            .slice(0, 8)
            .map((brand) => (
              <Pressable
                key={brand.id}
                accessibilityRole="button"
                accessibilityLabel={`Filtrar por marca ${brand.name}`}
                onPress={() => onSelectBrand(brand.id)}
                hitSlop={6}
                className="rounded-sm px-3 h-11 items-center justify-center bg-surface border border-border-strong active:opacity-90"
              >
                <Text variant="body-sm" numberOfLines={1}>
                  {brand.name}
                </Text>
              </Pressable>
            ))}
        </View>
      )}

      {/* Ver tudo */}
      <View className="px-4 mt-6">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver todas as miniaturas"
          onPress={onShowAll}
          className="rounded-md border border-border-strong px-4 h-11 items-center justify-center active:border-primary active:bg-primary-soft/40"
        >
          <Text variant="body" className="font-sans-medium">
            Todas as miniaturas
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Rodapé da FlashList: combina os 4 estados que o FooterState antigo
 * tratava separados (loading, error, empty e "carregando mais").
 */
function ResultsFooter({
  state,
  showSkeleton,
  total,
  loaded,
  hasFilters,
  onRetry,
  onClear,
}: {
  state: "loading" | "ok" | "error" | "empty";
  showSkeleton: boolean;
  total: number;
  loaded: number;
  hasFilters: boolean;
  onRetry: () => void;
  onClear: () => void;
}) {
  const { c } = useTheme();
  if (showSkeleton) {
    return (
      <View className="mt-3">
        <CarGridSkeleton />
      </View>
    );
  }
  if (state === "error") {
    return (
      <View className="py-12">
        <ErrorState onRetry={onRetry} />
      </View>
    );
  }
  if (state === "empty") {
    return (
      <View className="px-8 py-12 items-center">
        <EmptyState
          kind="no-cars"
          description="Tente outro termo ou limpe os filtros."
          action={
            hasFilters
              ? {
                  label: "Limpar filtros",
                  onPress: onClear,
                }
              : undefined
          }
        />
      </View>
    );
  }
  if (state === "ok" && loaded >= total && loaded > 0) {
    return (
      <Text variant="caption" tone="subtle" className="text-center mt-6 mb-2">
        Você viu tudo.
      </Text>
    );
  }
  if (state === "ok" && loaded < total && loaded > 0) {
    // "Carregando mais"
    return (
      <View>
        <CarGridSkeleton rows={1} />
        <View className="items-center py-3">
          <ActivityIndicator color={c("primary")} size="small" />
        </View>
      </View>
    );
  }
  return null;
}

function BadgeInline({ children, tone }: { children: React.ReactNode; tone: "primary" | "flame" }) {
  return (
    <Badge variant={tone} size="sm">
      {children}
    </Badge>
  );
}
