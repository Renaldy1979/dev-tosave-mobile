import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  RefreshControl,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { ArrowDownUp, ChevronDown, ChevronRight, ExternalLink, Share2, Trash2 } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useDelayedFlag } from "@/hooks/useDelayedFlag";
import { useGridLayout } from "@/hooks/useGridColumns";
import { useCollectionStore } from "@/hooks/useCollectionStore";
import { getCollectionPaged, type CollectionSort } from "@/services";
import type { CarListItem, CollectionItemWithCar } from "@/types";
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

/** Página da Coleção e mapa da ordenação da tela para a da API. */
const PAGE = 20;
const SORT_API: Record<SortOption, CollectionSort> = {
  recent: "recent",
  name: "name",
  year: "year",
  units: "quantity",
};

/**
 * Tela Coleção (`docs/design/telas/06-colecao.md`).
 *
 * Resumo (3 StatTiles) + busca + SegmentedControl (Todos | Repetidos)
 * + ordenação (BottomSheet) + grid 2 colunas (a quantidade muda só no Detalhe).
 * Empty states oficiais + LoginGate quando não há sessão.
 *
 * Lista paginada no servidor (busca, "Repetidos" e ordenação na API);
 * a posse vem em cada item. O resumo vem do `useCollectionStore`, que
 * não guarda a coleção.
 */
export default function Colecao() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string; dup?: string }>();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { user } = useCurrentUser();
  const collection = useCollectionStore();
  const { show } = useToast();
  const grid = useGridLayout();
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

  // Lista paginada no servidor (20 por página, mais ao rolar), com busca,
  // "Repetidos" e ordenação na API. A posse de cada card vem no item;
  // `quantityOf` aplica os toques desta sessão, e o card sai da lista
  // quando chega a 0 — sem recarregar a página.
  const [rows, setRows] = useState<CollectionItemWithCar[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [listState, setListState] = useState<"loading" | "ok" | "error">("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const requestId = useRef(0);

  // Resumo buscado ao abrir a Coleção.
  const { refreshSummary } = collection;
  useEffect(() => {
    refreshSummary().catch(() => undefined);
  }, [refreshSummary]);

  const loadFirst = useCallback(
    async (mode: "initial" | "refresh") => {
      const id = ++requestId.current;
      if (mode === "initial") setListState("loading");
      try {
        // Nova ordenação recomeça sem cursor (o cursor vale só para a sua).
        const page = await getCollectionPaged({
          q: debouncedTerm,
          duplicatesOnly,
          sort: SORT_API[sort],
          pageSize: PAGE,
        });
        if (id !== requestId.current) return;
        setRows(page.items);
        setCursor(page.nextCursor);
        setListState("ok");
      } catch (err) {
        if (id !== requestId.current) return;
        if (mode === "initial") setListState("error");
        else throw err;
      }
    },
    [debouncedTerm, duplicatesOnly, sort]
  );

  useEffect(() => {
    if (!user) return;
    void loadFirst("initial");
  }, [loadFirst, user]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore || listState !== "ok") return;
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const page = await getCollectionPaged({
        q: debouncedTerm,
        duplicatesOnly,
        sort: SORT_API[sort],
        cursor,
        pageSize: PAGE,
      });
      if (id !== requestId.current) return;
      setRows((cur) => [...cur, ...page.items]);
      setCursor(page.nextCursor);
    } catch {
      // Mantém o que já está na tela; o próximo fim de rolagem tenta de novo.
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, listState, debouncedTerm, duplicatesOnly, sort]);

  const visibleItems = useMemo(
    () =>
      rows
        .map((it) => ({ car: it.car as CarListItem, q: collection.quantityOf(it.car) }))
        .filter((e) => e.q > 0 && (!duplicatesOnly || e.q > 1)),
    [rows, collection, duplicatesOnly]
  );

  const carById = useCallback((carId: string) => rows.find((it) => it.carId === carId)?.car, [rows]);

  const summary = collection.summary;
  // "Coleção vazia" pelo resumo do servidor (sem filtros): busca ou
  // filtro sem resultado não é coleção vazia.
  const hasCollection = collection.loaded && summary.totalModels > 0;
  const collectionIsEmpty = collection.loaded && !collection.error && summary.totalModels === 0;
  const loadFailed = listState === "error" && rows.length === 0;
  const showSkeleton = useDelayedFlag(listState === "loading" || !collection.loaded, 150);

  // ----- Ações -----
  const handleRemove = useCallback(
    async (carId: string, previous: number) => {
      try {
        await collection.remove(carId, previous);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
        if (user) {
          show({
            type: "info",
            message: "Removida da sua coleção.",
            action: {
              label: "Desfazer",
              onPress: async () => {
                // O card continua em `rows`: volta sozinho com a quantidade.
                try {
                  await collection.setQuantity(carId, 0, previous);
                } catch {
                  show({ type: "danger", message: "Não foi possível atualizar sua coleção." });
                }
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
      await Promise.all([collection.refreshSummary(), loadFirst("refresh")]);
    } catch {
      show({ type: "danger", message: "Não foi possível atualizar." });
    } finally {
      setRefreshing(false);
    }
  }, [collection, show, loadFirst]);

  // Fase 2: app travado — sem sessão nunca chegamos aqui. O `_layout`
  // raiz redireciona para `/login` quando a sessão cai.
  if (!user) {
    return null;
  }

  // Sem TabBar: só a safe area inferior + respiro.
  const bottomPadding = insets.bottom + 24;

  const listHeader = (
    <View className="pb-4">
      {/* Resumo StatTiles (esconde quando vazio e enquanto carrega). */}
      {hasCollection ? (
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
          {/* Link para Estatísticas (11-estatisticas §6); some com o resumo. */}
          <View className="items-end">
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Ver estatísticas"
              onPress={() => router.navigate("/estatisticas")}
              hitSlop={8}
              className="flex-row items-center gap-1 active:opacity-70"
              style={{ minHeight: 44 }}
            >
              <Text variant="body-sm" tone="primary" className="font-sans-medium">
                Ver estatísticas
              </Text>
              <ChevronRight size={16} color={c("primary-text")} strokeWidth={1.75} />
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Busca + Todos | Repetidos + Ordenação: visíveis com coleção,
          inclusive com busca ou filtro sem resultado. */}
      {hasCollection ? (
        <View className="px-4 mt-4 gap-3">
          <SearchBar value={term} onChangeText={setTerm} placeholder="Buscar na coleção" />
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
                onChange={(v) => router.setParams({ dup: v === "dup" ? "1" : undefined })}
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
    </View>
  );

  const listEmpty = showSkeleton ? (
    <CarGridSkeleton />
  ) : loadFailed ? (
    <View className="px-8 pt-8 items-center">
      <ErrorState onRetry={() => loadFirst("initial")} />
    </View>
  ) : collectionIsEmpty ? (
    <View className="px-8 pt-8 items-center">
      <EmptyState
        kind="no-cars"
        description="Toque no coração de uma miniatura para começar sua coleção."
        action={{ label: "Explorar miniaturas", onPress: () => router.push("/busca") }}
      />
    </View>
  ) : listState === "ok" ? (
    // Busca ou "Repetidos" sem resultado — texto oficial da spec.
    <View className="px-8 py-8 items-center">
      <EmptyState
        kind="no-cars"
        description="Tente outro termo ou limpe os filtros."
        action={
          debouncedTerm.trim()
            ? { label: "Limpar busca", onPress: () => setTerm("") }
            : duplicatesOnly
              ? { label: "Ver todos", onPress: () => router.setParams({ dup: undefined }) }
              : undefined
        }
      />
    </View>
  ) : null;

  return (
    <ScreenContainer bg="bg" edges={["bottom"]} className="bg-bg">
      <Header variant="root" title="Minha coleção" />

      <FlashList
        data={loadFailed || collectionIsEmpty || showSkeleton ? [] : visibleItems}
        numColumns={grid.columns}
        keyExtractor={(item) => item.car.id}
        extraData={collection.version}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        refreshControl={
          <RefreshControl tintColor={c("primary")} refreshing={refreshing} onRefresh={refresh} />
        }
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={
          loadingMore ? (
            <View className="mt-2">
              <CarGridSkeleton rows={1} />
            </View>
          ) : null
        }
        renderItem={({ item, index }) => (
          <View style={grid.cellStyle(index)}>
            <CarCard
              car={item.car}
              variant="collection"
              width={grid.itemWidth}
              quantity={item.q}
              onPress={() => router.push(`/car/${item.car.id}`)}
              onLongPress={() => handleLongPress(item.car.id, item.q)}
            />
          </View>
        )}
      />

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
            ? carById(sheet.carId)?.title ?? ""
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
              const car = carById(sheet.carId) as CarListItem | undefined;
              if (!car) {
                setSheet(null);
                return;
              }
              const { brandName, serieTitle } = car;
              setSheet(null);
              void (async () => {
                const ok = await shareCar({
                  title: car.title,
                  brandName,
                  year: car.year,
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
                car: { id: sheet.carId, title: carById(sheet.carId)?.title ?? "" },
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
          await handleRemove(confirmRemove.car.id, confirmRemove.quantity);
        }}
      />
    </ScreenContainer>
  );
}
