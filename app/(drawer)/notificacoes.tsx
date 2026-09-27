import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshControl, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { CheckCheck } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { listNotificationsPaged, markAllNotificationsRead, markNotificationRead } from "@/services";
import type { NotificationItem } from "@/types";
import { notificationRoute } from "@/notifications/routing";
import {
  clearUnreadNotifications,
  decrementUnreadNotifications,
  useUnreadNotificationsCount,
} from "@/hooks/useNotifications";
import { useDelayedFlag } from "@/hooks/useDelayedFlag";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Header } from "@/components/ui/Header";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/components/ui/Toast";
import { NotificationRow, NotificationRowSkeleton } from "@/components/notifications/NotificationRow";

type ListState = "loading" | "ok" | "error";

/**
 * Caixa de notificações (lote 2, `docs/PLANO-ENTREGA.md`): lista
 * paginada com lida/não lida, "marcar todas como lidas" no header e
 * toque que marca a notificação como lida e navega pelo `type`/
 * `targetId` (mesma lógica do toque no push, `notifications/routing.ts`).
 */
export default function Notificacoes() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { show } = useToast();
  const unreadCount = useUnreadNotificationsCount();

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [state, setState] = useState<ListState>("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const requestId = useRef(0);

  const loadFirst = useCallback(async () => {
    const id = ++requestId.current;
    setState("loading");
    setMoreError(false);
    try {
      const page = await listNotificationsPaged({});
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
      const page = await listNotificationsPaged({ cursor });
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

  const handlePress = useCallback(
    async (item: NotificationItem) => {
      if (!item.read) {
        setItems((cur) => cur.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
        decrementUnreadNotifications(1);
        markNotificationRead(item.id).catch(() => undefined);
      }
      const route = notificationRoute(item.type, item.targetId);
      if (route) router.push(route);
    },
    [router]
  );

  const handleMarkAll = useCallback(async () => {
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setItems((cur) => cur.map((n) => ({ ...n, read: true })));
      clearUnreadNotifications();
    } catch {
      show({ type: "danger", message: "Não foi possível marcar como lidas." });
    } finally {
      setMarkingAll(false);
    }
  }, [unreadCount, markingAll, show]);

  const showSkeleton = useDelayedFlag(state === "loading", 150);

  const empty =
    state === "loading" ? (
      showSkeleton ? (
        <View style={{ gap: 8 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <NotificationRowSkeleton key={i} />
          ))}
        </View>
      ) : null
    ) : state === "error" ? (
      <View className="pt-8">
        <ErrorState onRetry={loadFirst} />
      </View>
    ) : (
      <View className="pt-8">
        <EmptyState kind="no-content" description="Você não tem notificações." size="lg" />
      </View>
    );

  const footer = loadingMore ? (
    <View style={{ gap: 8, paddingTop: 8 }}>
      <NotificationRowSkeleton />
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
      <Header
        variant="root"
        title="Notificações"
        action={
          unreadCount > 0
            ? { icon: CheckCheck, accessibilityLabel: "Marcar todas como lidas", onPress: handleMarkAll }
            : undefined
        }
      />
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
          <NotificationRow
            title={item.title}
            body={item.body}
            read={item.read}
            createdAt={item.createdAt}
            onPress={() => handlePress(item)}
          />
        )}
      />
    </ScreenContainer>
  );
}
