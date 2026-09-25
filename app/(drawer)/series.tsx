import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshControl, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { listSeriesPaged, type SerieListItem } from "@/services";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useDelayedFlag } from "@/hooks/useDelayedFlag";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Header } from "@/components/ui/Header";
import { SearchBar } from "@/components/ui/SearchBar";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { SerieRow, SerieRowSkeleton } from "@/components/car/SerieRow";

type ListState = "loading" | "ok" | "error";

/**
 * Lista de séries (`docs/design/telas/10-series.md` §A).
 *
 * Uma única FlashList (SearchBar e contagem no header), A–Z, 30 por
 * página com rolagem infinita. Busca por título no servidor com
 * debounce de 300 ms. A posse ("Você tem X") vem junto de cada página
 * (`owned` de cada série, calculado no servidor).
 */
export default function Series() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { show } = useToast();

  const [term, setTerm] = useState("");
  const search = useDebouncedValue(term.trim(), 300);

  const [items, setItems] = useState<SerieListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [cursor, setCursor] = useState<string | null>(null);
  const [state, setState] = useState<ListState>("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Descarta respostas de buscas antigas (digitação rápida).
  const requestId = useRef(0);

  const loadFirst = useCallback(
    async (mode: "initial" | "refresh" | "silent") => {
      const id = ++requestId.current;
      if (mode === "initial") setState("loading");
      setMoreError(false);
      try {
        const page = await listSeriesPaged({ search });
        if (id !== requestId.current) return;
        setItems(page.items);
        setTotal(page.total ?? page.items.length);
        setCursor(page.nextCursor);
        setState("ok");
      } catch {
        if (id !== requestId.current) return;
        // Relida silenciosa (foco) que falha mantém a lista como está.
        if (mode === "refresh") {
          show({ type: "danger", message: "Não foi possível atualizar." });
        } else if (mode === "initial") {
          setState("error");
        }
      }
    },
    [search, show]
  );

  useEffect(() => {
    void loadFirst("initial");
  }, [loadFirst]);

  // Ao voltar à tela (drawer mantém montada), relê a 1ª página em
  // silêncio para atualizar o "Você tem X".
  const focusedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!focusedOnce.current) {
        focusedOnce.current = true;
        return;
      }
      void loadFirst("silent");
    }, [loadFirst])
  );

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore || state !== "ok") return;
    const id = requestId.current;
    setLoadingMore(true);
    setMoreError(false);
    try {
      const page = await listSeriesPaged({ search, cursor });
      if (id !== requestId.current) return;
      setItems((cur) => [...cur, ...page.items]);
      setCursor(page.nextCursor);
    } catch {
      if (id === requestId.current) setMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, state, search]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadFirst("refresh");
    setRefreshing(false);
  }, [loadFirst]);

  const showSkeleton = useDelayedFlag(state === "loading", 150);
  const searching = search.length > 0;

  const header = (
    <View className="pt-3 pb-3 gap-3">
      <SearchBar value={term} onChangeText={setTerm} placeholder="Buscar série" />
      {state === "ok" ? (
        <Text variant="body-sm" tone="muted" accessibilityLiveRegion="polite">
          {searching
            ? `${total} ${total === 1 ? "resultado" : "resultados"}`
            : `${total} ${total === 1 ? "série" : "séries"}`}
        </Text>
      ) : state === "loading" && showSkeleton ? (
        <Skeleton.Rect style={{ width: 90, height: 14 }} />
      ) : null}
    </View>
  );

  const empty =
    state === "loading" ? (
      showSkeleton ? (
        <View style={{ gap: 8 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <SerieRowSkeleton key={i} />
          ))}
        </View>
      ) : null
    ) : state === "error" ? (
      <View className="pt-8">
        <ErrorState onRetry={() => loadFirst("initial")} />
      </View>
    ) : searching ? (
      <View className="pt-8">
        <EmptyState
          kind="no-content"
          description="Tente outro nome."
          action={{ label: "Limpar busca", onPress: () => setTerm("") }}
        />
      </View>
    ) : (
      <View className="pt-8">
        <EmptyState kind="no-content" size="lg" />
      </View>
    );

  const footer = loadingMore ? (
    <View style={{ gap: 8, paddingTop: 8 }}>
      <SerieRowSkeleton />
      <SerieRowSkeleton />
    </View>
  ) : moreError ? (
    <View className="items-center gap-2 pt-4">
      <Text variant="body-sm" tone="muted">
        Não foi possível carregar mais.
      </Text>
      <Button label="Tentar novamente" variant="outline" size="sm" onPress={loadMore} />
    </View>
  ) : null;

  return (
    <ScreenContainer bg="bg" edges={["bottom"]} className="bg-bg">
      <Header variant="root" title="Séries" />
      <FlashList
        data={state === "ok" ? items : []}
        keyExtractor={(item) => item.id}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 24 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ListFooterComponent={footer}
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        refreshControl={
          <RefreshControl tintColor={c("primary")} refreshing={refreshing} onRefresh={refresh} />
        }
        renderItem={({ item }) => (
          <SerieRow
            title={item.title}
            image={item.imagem}
            carCount={item.carCount}
            owned={item.owned}
            featured={item.isDefault}
            onPress={() => router.push(`/serie/${item.id}`)}
          />
        )}
      />
    </ScreenContainer>
  );
}
