import { useCallback, useEffect, useMemo, useState } from "react";
import {
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
import { ArrowDownUp, ChevronDown, ExternalLink, Share2, Trash2 } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useDelayedFlag } from "@/hooks/useDelayedFlag";
import { useGridColumns } from "@/hooks/useGridColumns";
import { useCollectionStore } from "@/hooks/useCollectionStore";
import { listBrands, listSeries, setCollectionQuantity } from "@/services";
import type { Brand, CarListItem, Serie } from "@/types";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Header } from "@/components/ui/Header";
import { Text } from "@/components/ui/Text";
import { SearchBar } from "@/components/ui/SearchBar";
import { StatTile } from "@/components/ui/StatTile";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { CarCard } from "@/components/car/CarCard";
import { CarGridSkeleton } from "@/components/car/CarCardSkeleton";
import { BottomSheet, SheetPressable } from "@/components/ui/BottomSheet";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ListRow } from "@/components/ui/ListRow";
import { useToast } from "@/components/ui/Toast";
// LoginGate removido na fase 2 — app travado.
import { shareCar } from "@/components/ui/ShareWhatsAppButton";

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
 *
 * Fonte única: `useCollectionStore` (store de módulo). Não há `getCollection`
 * local — o Provider já carrega o `carsById` e o resumo. A Coleção só
 * consome o store e renderiza.
 */
export default function Colecao() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string; dup?: string }>();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { user } = useCurrentUser();
  const collection = useCollectionStore();
  const { show } = useToast();
  const columns = useGridColumns();
  const [refreshing, setRefreshing] = useState(false);

  const [term, setTerm] = useState<string>(params.q ?? "");
  const [debouncedTerm, setDebouncedTerm] = useState<string>(term);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedTerm(term), 300);
    return () => clearTimeout(id);
  }, [term]);

  const duplicatesOnly = params.dup === "1";
  const [sort, setSort] = useState<SortOption>("recent");
  const [sortOpen, setSortOpen] = useState(false);

  // Marcas e Séries (apenas para resolver `brandName` e `serieTitle` dos cards).
  const [brands, setBrands] = useState<Brand[]>([]);
  const [series, setSeries] = useState<Serie[]>([]);
  useEffect(() => {
    void Promise.all([listBrands(), listSeries()])
      .then(([b, s]) => {
        setBrands(b);
        setSeries(s);
      })
      .catch(() => undefined);
  }, []);

  // Sinal "searching" local, só para feedback do skeleton durante a busca
  // — sem isso, a UI pisca entre estados a cada keystroke.
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    if (!collection.loaded) return;
    setSearching(true);
    const t = setTimeout(() => setSearching(false), 120);
    return () => clearTimeout(t);
  }, [debouncedTerm, duplicatesOnly, collection.loaded]);

  const brandNameOf = useCallback(
    (id: string) => brands.find((b) => b.id === id)?.name ?? "",
    [brands]
  );
  const serieTitleOf = useCallback(
    (id: string) => series.find((s) => s.id === id)?.title ?? "",
    [series]
  );
  const toListItem = useCallback(
    (carId: string): CarListItem | null => {
      const car = collection.carsById[carId];
      if (!car) return null;
      return {
        ...car,
        brandName: brandNameOf(car.brandId),
        serieTitle: serieTitleOf(car.serieId),
      };
    },
    [collection.carsById, brandNameOf, serieTitleOf]
  );

  // Lista filtrada (busca + repetidos) e ordenada.
  const visibleItems = useMemo(() => {
    const entries = Object.entries(collection.items)
      .filter(([, q]) => q > 0)
      .map(([carId, q]) => ({ carId, q }));
    let arr = entries
      .map((e) => {
        const listItem = toListItem(e.carId);
        if (!listItem) return null;
        // `q` é o quantity do item; o store tem o `Car` resolvido.
        const car = collection.carsById[e.carId];
        if (!car) return null;
        return { car, q: e.q };
      })
      .filter((v): v is { car: NonNullable<ReturnType<typeof toListItem>>; q: number } => v !== null);
    if (debouncedTerm.trim()) {
      const term = debouncedTerm.toLowerCase();
      arr = arr.filter(
        (e) =>
          e.car.title.toLowerCase().includes(term) ||
          e.car.toy.toLowerCase().includes(term) ||
          e.car.collector.toLowerCase().includes(term)
      );
    }
    if (duplicatesOnly) {
      arr = arr.filter((e) => e.q > 1);
    }
    switch (sort) {
      case "name":
        arr.sort((a, b) => a.car.title.localeCompare(b.car.title));
        break;
      case "year":
        arr.sort((a, b) => b.car.year - a.car.year);
        break;
      case "units":
        arr.sort((a, b) => b.q - a.q);
        break;
      case "recent":
      default:
        // Mock sem createdAt nos Car — cai para `year desc` como fallback.
        arr.sort((a, b) => b.car.year - a.car.year);
    }
    return arr;
  }, [collection.items, collection.carsById, toListItem, debouncedTerm, duplicatesOnly, sort]);

  const summary = collection.summary;
  const collectionIsEmpty = collection.summary.totalItems === 0;
  const showSkeleton = useDelayedFlag(!collection.loaded, 150);

  // ----- Ações -----
  const handleChangeQuantity = useCallback(
    async (carId: string, current: number, next: number) => {
      if (next <= 0) {
        const car = collection.carsById[carId];
        if (car) setConfirmRemove({ car, quantity: current });
        return;
      }
      try {
        await collection.setQuantity(carId, next);
      } catch {
        show({ type: "danger", message: "Não foi possível atualizar sua coleção." });
      }
    },
    [collection, show]
  );

  const handleRemove = useCallback(
    async (carId: string) => {
      const previous = collection.items[carId] ?? 0;
      try {
        await collection.remove(carId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
        if (user) {
          show({
            type: "info",
            message: "Removida da sua coleção.",
            action: {
              label: "Desfazer",
              onPress: async () => {
                await setCollectionQuantity(carId, previous);
                await collection.refresh();
              },
            },
          });
        }
      } catch {
        show({ type: "danger", message: "Não foi possível atualizar sua coleção." });
      }
      setConfirmRemove(null);
    },
    [collection, show, user]
  );

  const [confirmRemove, setConfirmRemove] = useState<
    { car: { id: string; title: string }; quantity: number } | null
  >(null);
  const [sheet, setSheet] = useState<{ carId: string; quantity: number } | null>(null);

  const handleLongPress = useCallback(
    (carId: string, quantity: number) => {
      Haptics.selectionAsync().catch(() => undefined);
      setSheet({ carId, quantity });
    },
    []
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await collection.refresh();
    } catch {
      show({ type: "danger", message: "Não foi possível atualizar." });
    } finally {
      setRefreshing(false);
    }
  }, [collection, show]);

  // Header scrollY
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  // Fase 2: app travado — sem sessão nunca chegamos aqui. O `_layout`
  // raiz redireciona para `/login` quando a sessão cai.
  if (!user) {
    return null;
  }

  const subTitle =
    summary.totalItems > 0
      ? `${summary.totalItems} ${summary.totalItems === 1 ? "miniatura" : "miniaturas"} · ${summary.totalModels} ${summary.totalModels === 1 ? "modelo" : "modelos"}`
      : undefined;

  const bottomPadding = 56 + insets.bottom + 24;

  return (
    <ScreenContainer bg="bg" edges={["bottom"]} className="bg-bg">
      <Header variant="large" title="Minha coleção" subtitle={subTitle} scrollY={scrollY} />

      <Animated.ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        refreshControl={
          <RefreshControl tintColor={c("primary")} refreshing={refreshing} onRefresh={refresh} />
        }
      >
        {/* Resumo StatTiles (esconde quando vazio e enquanto carrega). */}
        {!collectionIsEmpty && !showSkeleton ? (
          <View className="px-4 mt-3">
            <View className="rounded-lg bg-surface border border-border p-3 flex-row">
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
                label="Repetidos"
                onPress={() => router.setParams({ dup: duplicatesOnly ? undefined : "1" })}
                accessibilityLabel={`${summary.duplicates} modelos repetidos, toque para filtrar`}
              />
            </View>
          </View>
        ) : null}

        {/* Busca + Filtro Todos | Repetidos + Ordenação — sempre visíveis
            quando há itens na coleção, inclusive durante o skeleton inicial
            e enquanto o usuário digita. */}
        {!collectionIsEmpty && collection.loaded ? (
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
                      label: `Repetidos${summary.duplicates > 0 ? ` · ${summary.duplicates}` : ""}`,
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

        {/* Conteúdo: o store já carregou → renderiza. Sem dois
            carregamentos concorrentes. */}
        {showSkeleton ? (
          <View className="px-3 mt-4">
            <CarGridSkeleton numColumns={columns} />
          </View>
        ) : collectionIsEmpty ? (
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
        ) : searching && visibleItems.length === 0 ? (
          <View className="px-3 mt-4">
            <CarGridSkeleton numColumns={columns} />
          </View>
        ) : visibleItems.length === 0 ? (
          // filtro "repetidos" ou busca sem itens — texto oficial da spec.
          <View className="px-8 py-8 items-center">
            <EmptyState
              kind="no-cars"
              description="Tente outro termo ou limpe os filtros."
              action={
                duplicatesOnly
                  ? { label: "Ver todos", onPress: () => router.setParams({ dup: undefined }) }
                  : debouncedTerm.trim()
                    ? { label: "Limpar busca", onPress: () => setTerm("") }
                    : undefined
              }
            />
          </View>
        ) : (
          <View className="mt-4 px-1">
            <FlashList
              data={visibleItems}
              numColumns={columns}
              keyExtractor={(item) => item.car.id}
              contentContainerStyle={{ paddingHorizontal: 12, gap: 12 }}
              renderItem={({ item }) => {
                const listItem = toListItem(item.car.id);
                if (!listItem) return null;
                return (
                  <View style={{ width: `${100 / columns}%` }}>
                    <CarCard
                      car={listItem}
                      variant="collection"
                      quantity={item.q}
                      onPress={() => router.push(`/car/${item.car.id}`)}
                      onLongPress={() => handleLongPress(item.car.id, item.q)}
                      onChangeQuantity={(next) => handleChangeQuantity(item.car.id, item.q, next)}
                      onRemoveRequest={() =>
                        setConfirmRemove({ car: item.car, quantity: item.q })
                      }
                    />
                  </View>
                );
              }}
            />
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
        title={
          sheet
            ? collection.carsById[sheet.carId]?.title ?? ""
            : ""
        }
        snapPoints="dynamic"
      >
        <View className="pb-2">
          <ListRow
            icon={ExternalLink}
            label="Ver detalhes"
            onPress={() => {
              if (!sheet) return;
              const id = sheet.carId;
              setSheet(null);
              router.push(`/car/${id}`);
            }}
          />
          <View className="border-t border-border" />
          <ListRow
            icon={Share2}
            label="Compartilhar no WhatsApp"
            showChevron={false}
            onPress={() => {
              if (!sheet) return;
              const car = collection.carsById[sheet.carId];
              if (!car) {
                setSheet(null);
                return;
              }
              const brandName = brandNameOf(car.brandId);
              const serieTitle = serieTitleOf(car.serieId);
              setSheet(null);
              void (async () => {
                const ok = await shareCar({
                  title: car.title,
                  brandName,
                  year: car.year,
                  collector: car.collector,
                  toy: car.toy,
                  serieTitle,
                });
                if (!ok) {
                  show({ type: "danger", message: "Não foi possível compartilhar agora." });
                }
              })();
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
              setConfirmRemove({
                car: { id: sheet.carId, title: collection.carsById[sheet.carId]?.title ?? "" },
                quantity: sheet.quantity,
              });
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
          confirmRemove ? `${confirmRemove.car.title} sai da sua coleção.` : undefined
        }
        onConfirm={async () => {
          if (!confirmRemove) return;
          await handleRemove(confirmRemove.car.id);
        }}
      />
    </ScreenContainer>
  );
}
