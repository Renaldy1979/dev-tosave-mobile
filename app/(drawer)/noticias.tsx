import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshControl, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { listNewsPaged } from "@/services";
import type { NewsItem } from "@/types";
import { useDelayedFlag } from "@/hooks/useDelayedFlag";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Header } from "@/components/ui/Header";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/components/ui/Toast";
import { NewsCard, NewsCardSkeleton } from "@/components/news/NewsCard";

type ListState = "loading" | "ok" | "error";

/**
 * Feed de notícias (lote 1, `docs/PLANO-ENTREGA.md`). Lista paginada
 * por cursor (mais recentes primeiro), pull-to-refresh e estados de
 * vazio/erro/carregando. Sem busca — a API não pagina por termo aqui.
 */
export default function Noticias() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { show } = useToast();

  const [items, setItems] = useState<NewsItem[]>([]);
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
      const page = await listNewsPaged({});
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
      const page = await listNewsPaged({ cursor });
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
          {Array.from({ length: 6 }).map((_, i) => (
            <NewsCardSkeleton key={i} />
          ))}
        </View>
      ) : null
    ) : state === "error" ? (
      <View className="pt-8">
        <ErrorState onRetry={loadFirst} />
      </View>
    ) : (
      <View className="pt-8">
        <EmptyState kind="no-content" size="lg" />
      </View>
    );

  const footer = loadingMore ? (
    <View style={{ gap: 8, paddingTop: 8 }}>
      <NewsCardSkeleton />
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
      <Header variant="root" title="Notícias" />
      <FlashList
        data={state === "ok" ? items : []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 24 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={empty}
        ListFooterComponent={footer}
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        refreshControl={
          <RefreshControl tintColor={c("primary")} refreshing={refreshing} onRefresh={refresh} />
        }
        renderItem={({ item }) => (
          <NewsCard
            title={item.title}
            summary={item.summary}
            publishedAt={item.publishedAt}
            image={item.imagem}
            onPress={() => router.push(`/noticia/${item.id}`)}
          />
        )}
      />
    </ScreenContainer>
  );
}
