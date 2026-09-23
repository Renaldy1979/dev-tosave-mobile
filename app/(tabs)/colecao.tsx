import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { ArrowDownUp, ChevronDown, Share2, Trash2 } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useDelayedFlag } from "@/hooks/useDelayedFlag";
import { useGridColumns } from "@/hooks/useGridColumns";
import {
  getCollection,
  getCollectionSummary,
  removeFromCollection,
  setCollectionQuantity,
} from "@/services";
import { listBrands, listSeries } from "@/services";
import type {
  Brand,
  Car,
  CarListItem,
  CollectionItemWithCar,
  CollectionSummary,
  Serie,
} from "@/types";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Header } from "@/components/ui/Header";
import { Text } from "@/components/ui/Text";
import { SearchBar } from "@/components/ui/SearchBar";
import { StatTile, StatTileSkeleton } from "@/components/ui/StatTile";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { CarCard } from "@/components/car/CarCard";
import { CarGridSkeleton } from "@/components/car/CarCardSkeleton";
import { BottomSheet, SheetPressable } from "@/components/ui/BottomSheet";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ListRow } from "@/components/ui/ListRow";
import { useToast } from "@/components/ui/Toast";
import { LoginGate } from "@/components/ui/LoginGate";

type SortOption = "recent" | "name" | "year" | "units";
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recent", label: "Adicionados recentemente" },
  { value: "name", label: "Nome A–Z" },
  { value: "year", label: "Ano (mais novo)" },
  { value: "units", label: "Mais unidades" },
];

/**
 * Tela Coleção (`docs/design/telas/06-colecao.md`).
 *
 * Resumo (3 StatTiles) + busca + SegmentedControl (Todos | Repetidos)
 * + ordenação (BottomSheet) + grid 2 colunas com stepper glass no card.
 * Empty states oficiais + LoginGate quando não há sessão.
 */
export default function Colecao() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string; dup?: string }>();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { user } = useCurrentUser();
  const { show } = useToast();
  const columns = useGridColumns();

  const [term, setTerm] = useState<string>(params.q ?? "");
  const [debouncedTerm, setDebouncedTerm] = useState<string>(term);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedTerm(term), 300);
    return () => clearTimeout(id);
  }, [term]);

  const duplicatesOnly = params.dup === "1";
  const [sort, setSort] = useState<SortOption>("recent");
  const [sortOpen, setSortOpen] = useState(false);

  const [items, setItems] = useState<CollectionItemWithCar[]>([]);
  const [summary, setSummary] = useState<CollectionSummary | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ok" | "error" | "empty">("loading");
  const [summaryState, setSummaryState] = useState<"loading" | "ok" | "error">("loading");
  const [brands, setBrands] = useState<Brand[]>([]);
  const [series, setSeries] = useState<Serie[]>([]);
  const showSkeleton = useDelayedFlag(loadState === "loading", 150);
  const showSummarySkeleton = useDelayedFlag(summaryState === "loading", 150);

  // Para o ConfirmDialog de remoção via stepper
  const [confirmRemove, setConfirmRemove] = useState<{ car: Car; quantity: number } | null>(null);

  // BottomSheet de long-press
  const [sheet, setSheet] = useState<{ car: Car; quantity: number } | null>(null);

  // ----- Carga -----
  const load = useCallback(async () => {
    if (!user) return;
    setLoadState("loading");
    setSummaryState("loading");
    try {
      const [list, sum] = await Promise.all([
        getCollection(user.id, { q: debouncedTerm, duplicatesOnly }),
        getCollectionSummary(user.id),
      ]);
      setItems(list);
      setSummary(sum);
      setLoadState(list.length === 0 ? "empty" : "ok");
      setSummaryState("ok");
    } catch {
      setLoadState("error");
      setSummaryState("error");
    }
  }, [user, debouncedTerm, duplicatesOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  // Carrega marcas e séries (para resolver nome nos cards da Coleção).
  useEffect(() => {
    void Promise.all([listBrands(), listSeries()])
      .then(([b, s]) => {
        setBrands(b);
        setSeries(s);
      })
      .catch(() => undefined);
  }, []);

  // Helper para resolver nomes
  const brandNameOf = useCallback(
    (id: string) => brands.find((b) => b.id === id)?.name ?? "",
    [brands]
  );
  const serieTitleOf = useCallback(
    (id: string) => series.find((s) => s.id === id)?.title ?? "",
    [series]
  );

  // Helper para montar CarListItem a partir de um Car do item
  const toListItem = useCallback(
    (car: Car): CarListItem => ({
      ...car,
      brandName: brandNameOf(car.brandId),
      serieTitle: serieTitleOf(car.serieId),
    }),
    [brandNameOf, serieTitleOf]
  );

  // ----- Ordenação -----
  const sortedItems = useMemo(() => {
    const arr = [...items];
    switch (sort) {
      case "name":
        arr.sort((a, b) => a.car.title.localeCompare(b.car.title));
        break;
      case "year":
        arr.sort((a, b) => b.car.year - a.car.year);
        break;
      case "units":
        arr.sort((a, b) => b.quantity - a.quantity);
        break;
      case "recent":
      default:
        arr.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return arr;
  }, [items, sort]);

  // ----- Ações -----
  const handleChangeQuantity = useCallback(
    async (car: Car, current: number, next: number) => {
      if (!user) return;
      if (next <= 0) {
        setConfirmRemove({ car, quantity: current });
        return;
      }
      // Otimista
      const prevItem = items.find((it) => it.carId === car.id);
      if (!prevItem) return;
      const previousQty = prevItem.quantity;
      setItems((cur) =>
        cur.map((it) =>
          it.carId === car.id ? { ...it, quantity: next } : it
        )
      );
      // Atualiza summary otimista
      setSummary((cur) => {
        if (!cur) return cur;
        const delta = next - previousQty;
        return {
          ...cur,
          totalItems: cur.totalItems + delta,
          duplicates: cur.duplicates + (next > 1 ? 1 : 0) - (previousQty > 1 ? 1 : 0),
        };
      });
      Haptics.selectionAsync().catch(() => undefined);
      try {
        await setCollectionQuantity(user.id, car.id, next);
      } catch {
        // rollback
        setItems((cur) =>
          cur.map((it) =>
            it.carId === car.id ? { ...it, quantity: previousQty } : it
          )
        );
        setSummary((cur) => {
          if (!cur) return cur;
          const delta = previousQty - next;
          return {
            ...cur,
            totalItems: cur.totalItems + delta,
            duplicates: cur.duplicates + (previousQty > 1 ? 1 : 0) - (next > 1 ? 1 : 0),
          };
        });
        show({ type: "danger", message: "Não foi possível atualizar sua coleção." });
      }
    },
    [user, items, show]
  );

  const handleRemove = useCallback(
    async (car: Car, quantity: number) => {
      if (!user) return;
      const previousItem = items.find((it) => it.carId === car.id);
      const previousQty = previousItem?.quantity ?? 0;
      // Otimista
      setItems((cur) => cur.filter((it) => it.carId !== car.id));
      setSummary((cur) => {
        if (!cur) return cur;
        return {
          totalItems: Math.max(0, cur.totalItems - previousQty),
          totalModels: Math.max(0, cur.totalModels - 1),
          duplicates: Math.max(0, cur.duplicates - (previousQty > 1 ? 1 : 0)),
        };
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
      try {
        await removeFromCollection(user.id, car.id);
        show({
          type: "info",
          message: "Removida da sua coleção.",
          action: {
            label: "Desfazer",
            onPress: async () => {
              await setCollectionQuantity(user.id, car.id, previousQty);
              await load();
            },
          },
        });
      } catch {
        // rollback
        setItems((cur) => {
          if (!previousItem) return cur;
          if (cur.some((it) => it.carId === car.id)) return cur;
          return [...cur, previousItem];
        });
        setSummary((cur) => {
          if (!cur) return cur;
          return {
            totalItems: cur.totalItems + previousQty,
            totalModels: cur.totalModels + 1,
            duplicates: cur.duplicates + (previousQty > 1 ? 1 : 0),
          };
        });
        show({ type: "danger", message: "Não foi possível atualizar sua coleção." });
      }
      setConfirmRemove(null);
    },
    [user, items, show, load]
  );

  const handleLongPress = useCallback(
    (car: Car, quantity: number) => {
      Haptics.selectionAsync().catch(() => undefined);
      setSheet({ car, quantity });
    },
    []
  );

  // ----- Header scrollY -----
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  // ----- LoginGate -----
  if (!user) {
    return (
      <ScreenContainer bg="bg" edges={["bottom"]} className="bg-bg">
        <Header variant="large" title="Sua coleção" scrollY={scrollY} />
        <LoginGate
          title="Entre para ver sua coleção"
          description="Suas miniaturas ficam salvas na sua conta."
          next="/colecao"
        />
      </ScreenContainer>
    );
  }

  // ----- Sub-título -----
  const subTitle =
    summary && summary.totalItems > 0
      ? `${summary.totalItems} ${summary.totalItems === 1 ? "miniatura" : "miniaturas"} · ${summary.totalModels} ${summary.totalModels === 1 ? "modelo" : "modelos"}`
      : undefined;

  const bottomPadding = 56 + insets.bottom + 24;

  return (
    <ScreenContainer bg="bg" edges={["bottom"]} className="bg-bg">
      <Header variant="large" title="Sua coleção" subtitle={subTitle} scrollY={scrollY} />

      <Animated.ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        refreshControl={
          <RefreshControl tintColor={c("primary")} refreshing={false} onRefresh={load} />
        }
      >
        {/* Resumo StatTiles (esconde quando vazio, per spec) */}
        {!showSkeleton || loadState !== "empty" ? (
          <View className="px-4 mt-3">
            <View className="rounded-lg bg-surface border border-border p-3 flex-row">
              {showSummarySkeleton && summaryState === "loading" ? (
                <>
                  <StatTileSkeleton />
                  <StatTileSkeleton />
                  <StatTileSkeleton />
                </>
              ) : summary ? (
                <>
                  <StatTile
                    value={summary.totalItems}
                    label="Itens"
                    accessibilityLabel={`${summary.totalItems} itens na coleção`}
                  />
                  <StatTile
                    value={summary.totalModels}
                    label="Modelos"
                    accessibilityLabel={`${summary.totalModels} modelos na coleção`}
                  />
                  <StatTile
                    value={summary.duplicates}
                    label="Repetid."
                    onPress={() => router.setParams({ dup: duplicatesOnly ? undefined : "1" })}
                    accessibilityLabel={`${summary.duplicates} modelos repetidos, toque para filtrar`}
                  />
                </>
              ) : (
                <ErrorState
                  size="sm"
                  title="Resumo indisponível."
                  onRetry={load}
                  className="flex-1"
                />
              )}
            </View>
          </View>
        ) : null}

        {/* Busca + Filtro Todos | Repetidos + Ordenação (somente quando há itens) */}
        {loadState !== "empty" && loadState !== "loading" ? (
          <View className="px-4 mt-4 gap-3">
            <SearchBar
              value={term}
              onChangeText={setTerm}
              placeholder="Buscar na coleção"
            />
            <View className="flex-row items-center gap-2">
              <View className="flex-1">
                <SegmentedControl
                  options={[
                    { value: "all", label: "Todos" },
                    {
                      value: "dup",
                      label: `Repetidos${summary && summary.duplicates > 0 ? ` · ${summary.duplicates}` : ""}`,
                    },
                  ]}
                  value={duplicatesOnly ? "dup" : "all"}
                  onChange={(v) =>
                    router.setParams({ dup: v === "dup" ? "1" : undefined })
                  }
                  accessibilityLabel="Filtro de itens repetidos"
                />
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ordenar coleção"
                onPress={() => setSortOpen(true)}
                hitSlop={12}
                className="flex-row items-center gap-1 px-3 h-11 rounded-md bg-surface-2 active:bg-surface-3"
              >
                <ArrowDownUp color={c("fg-muted")} size={16} strokeWidth={1.75} />
                <ChevronDown color={c("fg-muted")} size={14} strokeWidth={1.75} />
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Conteúdo (lista / skeleton / empty / error) */}
        {showSkeleton ? (
          <View className="px-3 mt-4">
            <CarGridSkeleton numColumns={columns} />
          </View>
        ) : loadState === "empty" && summary && summary.totalItems === 0 ? (
          // coleção vazia — esconde controles
          <View className="px-8 pt-8 items-center">
            <EmptyState
              kind="no-cars"
              description="Toque no coração de uma miniatura para começar sua coleção."
              action={{
                label: "Explorar miniaturas",
                onPress: () => router.push("/busca"),
              }}
            />
          </View>
        ) : loadState === "empty" ? (
          // filtro "repetidos" sem itens
          <View className="px-8 pt-8 items-center">
            <EmptyState
              kind="no-cars"
              action={{
                label: "Ver todos",
                onPress: () => router.setParams({ dup: undefined }),
              }}
            />
          </View>
        ) : loadState === "error" ? (
          <View className="py-12">
            <ErrorState onRetry={load} />
          </View>
        ) : (
          <View className="mt-4">
            {debouncedTerm && sortedItems.length === 0 ? (
              <View className="px-8 py-8 items-center">
                <EmptyState
                  kind="no-cars"
                  description="Tente outro termo ou limpe a busca."
                  action={{
                    label: "Limpar busca",
                    onPress: () => setTerm(""),
                  }}
                />
              </View>
            ) : (
              <FlashList
                data={sortedItems}
                numColumns={columns}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: 12 }}
                renderItem={({ item }) => (
                  <View style={{ width: `${100 / columns}%`, paddingHorizontal: 4 }}>
                    <CarCard
                      car={toListItem(item.car)}
                      variant="collection"
                      quantity={item.quantity}
                      onPress={() => router.push(`/car/${item.car.id}`)}
                      onChangeQuantity={(next) => handleChangeQuantity(item.car, item.quantity, next)}
                      onRemoveRequest={() => setConfirmRemove({ car: item.car, quantity: item.quantity })}
                    />
                  </View>
                )}
              />
            )}
          </View>
        )}
      </Animated.ScrollView>

      {/* BottomSheet de ordenação */}
      <BottomSheet
        open={sortOpen}
        onClose={() => setSortOpen(false)}
        title="Ordenar por"
        snapPoints="dynamic"
      >
        <View className="pb-2">
          {SORT_OPTIONS.map((option) => (
            <SheetPressable
              key={option.value}
              onPress={() => {
                setSort(option.value);
                setSortOpen(false);
              }}
              className="active:bg-surface-3"
              accessibilityLabel={`Ordenar por ${option.label}`}
            >
              <View className="flex-row items-center px-5 min-h-14">
                <Text variant="body" className="flex-1">
                  {option.label}
                </Text>
                {sort === option.value ? (
                  <Text variant="body" tone="primary" className="font-sans-semibold">
                    ✓
                  </Text>
                ) : null}
              </View>
            </SheetPressable>
          ))}
        </View>
      </BottomSheet>

      {/* Long-press sheet (menu contextual) */}
      <BottomSheet
        open={sheet !== null}
        onClose={() => setSheet(null)}
        title={sheet ? sheet.car.title : ""}
        snapPoints="dynamic"
      >
        <View className="pb-2">
          <ListRow
            icon={Share2}
            label="Compartilhar no WhatsApp"
            showChevron={false}
            onPress={() => {
              if (!sheet) return;
              setSheet(null);
              show({ type: "info", message: "Use o botão compartilhar na tela do carro." });
            }}
          />
          <View className="border-t border-border" />
          <ListRow
            icon={Trash2}
            label="Remover da coleção"
            variant="danger"
            showChevron={false}
            onPress={() => {
              if (!sheet) return;
              setConfirmRemove({ car: sheet.car, quantity: sheet.quantity });
              setSheet(null);
            }}
          />
        </View>
      </BottomSheet>

      {/* ConfirmDialog */}
      <ConfirmDialog
        open={confirmRemove !== null}
        onClose={() => setConfirmRemove(null)}
        title="Remover da coleção?"
        description={
          confirmRemove
            ? `${confirmRemove.car.title} sai da sua coleção.`
            : undefined
        }
        onConfirm={async () => {
          if (!confirmRemove) return;
          await handleRemove(confirmRemove.car, confirmRemove.quantity);
        }}
      />
    </ScreenContainer>
  );
}
