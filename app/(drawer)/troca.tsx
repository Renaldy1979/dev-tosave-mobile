import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshControl, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { listMyTradePaged, listTradePaged } from "@/services";
import type { TradeListing, TradeType } from "@/types";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useDelayedFlag } from "@/hooks/useDelayedFlag";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Header } from "@/components/ui/Header";
import { SearchBar } from "@/components/ui/SearchBar";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/components/ui/Toast";
import { TradeListingCard, TradeListingCardSkeleton } from "@/components/trade/TradeListingCard";

type Tab = "vitrine" | "meus";
type TypeFilter = "all" | TradeType;
type ListState = "loading" | "ok" | "error";

/**
 * Clube da Troca (lote 3, `docs/PLANO-ENTREGA.md`): vitrine dos
 * anúncios ativos (filtro Troca/Venda + busca) e "Meus anúncios"
 * (todos os status) na mesma tela, alternados por segmento.
 */
export default function ClubeDaTroca() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("vitrine");

  return (
    <ScreenContainer bg="bg" edges={["bottom"]} className="bg-bg">
      <Header
        variant="root"
        title="Clube da Troca"
        action={{ icon: Plus, accessibilityLabel: "Anunciar", onPress: () => router.push("/anuncio/novo") }}
      />
      <View className="px-4 pt-3 pb-1">
        <SegmentedControl
          value={tab}
          onChange={setTab}
          accessibilityLabel="Vitrine ou meus anúncios"
          options={[
            { value: "vitrine", label: "Vitrine" },
            { value: "meus", label: "Meus anúncios" },
          ]}
        />
      </View>
      {tab === "vitrine" ? <Vitrine /> : <MeusAnuncios />}
    </ScreenContainer>
  );
}

/* ================================================================== */
/*                              VITRINE                                 */
/* ================================================================== */

function Vitrine() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { show } = useToast();

  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [term, setTerm] = useState("");
  const search = useDebouncedValue(term.trim(), 300);

  const [items, setItems] = useState<TradeListing[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [state, setState] = useState<ListState>("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const requestId = useRef(0);

  const loadFirst = useCallback(async () => {
    const id = ++requestId.current;
    setState("loading");
    setMoreError(false);
    try {
      const page = await listTradePaged({ type: typeFilter === "all" ? undefined : typeFilter, q: search });
      if (id !== requestId.current) return;
      setItems(page.items);
      setCursor(page.nextCursor);
      setState("ok");
    } catch {
      if (id !== requestId.current) return;
      setState("error");
    }
  }, [typeFilter, search]);

  useEffect(() => {
    void loadFirst();
  }, [loadFirst]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore || state !== "ok") return;
    const id = requestId.current;
    setLoadingMore(true);
    setMoreError(false);
    try {
      const page = await listTradePaged({ type: typeFilter === "all" ? undefined : typeFilter, q: search, cursor });
      if (id !== requestId.current) return;
      setItems((cur) => [...cur, ...page.items]);
      setCursor(page.nextCursor);
    } catch {
      if (id === requestId.current) setMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, state, typeFilter, search]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadFirst();
    } catch {
      show({ type: "danger", message: "Não foi possível atualizar." });
    } finally {
      setRefreshing(false);
    }
  }, [loadFirst, show]);

  const showSkeleton = useDelayedFlag(state === "loading", 150);

  const header = (
    <View className="pt-2 pb-3 gap-3">
      <SearchBar value={term} onChangeText={setTerm} placeholder="Buscar por nome ou código" />
      <SegmentedControl
        value={typeFilter}
        onChange={setTypeFilter}
        accessibilityLabel="Filtrar por tipo"
        options={[
          { value: "all", label: "Todos" },
          { value: "TRADE", label: "Troca" },
          { value: "SALE", label: "Venda" },
        ]}
      />
    </View>
  );

  const empty =
    state === "loading" ? (
      showSkeleton ? (
        <View style={{ gap: 8 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <TradeListingCardSkeleton key={i} />
          ))}
        </View>
      ) : null
    ) : state === "error" ? (
      <View className="pt-8">
        <ErrorState onRetry={loadFirst} />
      </View>
    ) : (
      <View className="pt-8">
        <EmptyState
          kind="no-content"
          description="Nenhum anúncio ativo no momento. Que tal criar o seu?"
          action={{ label: "Anunciar", onPress: () => router.push("/anuncio/novo") }}
        />
      </View>
    );

  const footer = loadingMore ? (
    <View style={{ gap: 8, paddingTop: 8 }}>
      <TradeListingCardSkeleton />
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
      refreshControl={<RefreshControl tintColor={c("primary")} refreshing={refreshing} onRefresh={refresh} />}
      renderItem={({ item }) => <TradeListingCard listing={item} onPress={() => router.push(`/anuncio/${item.id}`)} />}
    />
  );
}

/* ================================================================== */
/*                          MEUS ANÚNCIOS                               */
/* ================================================================== */

function MeusAnuncios() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { show } = useToast();

  const [items, setItems] = useState<TradeListing[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [state, setState] = useState<ListState>("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const requestId = useRef(0);

  const loadFirst = useCallback(async () => {
    const id = ++requestId.current;
    setState("loading");
    setMoreError(false);
    try {
      const page = await listMyTradePaged({});
      if (id !== requestId.current) return;
      setItems(page.items);
      setCursor(page.nextCursor);
      setState("ok");
    } catch {
      if (id !== requestId.current) return;
      setState("error");
    }
  }, []);

  useEffect(() => {
    void loadFirst();
  }, [loadFirst]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore || state !== "ok") return;
    const id = requestId.current;
    setLoadingMore(true);
    setMoreError(false);
    try {
      const page = await listMyTradePaged({ cursor });
      if (id !== requestId.current) return;
      setItems((cur) => [...cur, ...page.items]);
      setCursor(page.nextCursor);
    } catch {
      if (id === requestId.current) setMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, state]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadFirst();
    } catch {
      show({ type: "danger", message: "Não foi possível atualizar." });
    } finally {
      setRefreshing(false);
    }
  }, [loadFirst, show]);

  const showSkeleton = useDelayedFlag(state === "loading", 150);

  const empty =
    state === "loading" ? (
      showSkeleton ? (
        <View style={{ gap: 8 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <TradeListingCardSkeleton key={i} />
          ))}
        </View>
      ) : null
    ) : state === "error" ? (
      <View className="pt-8">
        <ErrorState onRetry={loadFirst} />
      </View>
    ) : (
      <View className="pt-8">
        <EmptyState kind="no-content" description="Você ainda não tem anúncios." />
      </View>
    );

  const footer = loadingMore ? (
    <View style={{ gap: 8, paddingTop: 8 }}>
      <TradeListingCardSkeleton />
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
    <FlashList
      data={state === "ok" ? items : []}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: insets.bottom + 24 }}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      ListEmptyComponent={empty}
      ListFooterComponent={footer}
      onEndReached={loadMore}
      onEndReachedThreshold={0.6}
      refreshControl={<RefreshControl tintColor={c("primary")} refreshing={refreshing} onRefresh={refresh} />}
      renderItem={({ item }) => <TradeListingCard listing={item} onPress={() => router.push(`/anuncio/${item.id}`)} />}
    />
  );
}
