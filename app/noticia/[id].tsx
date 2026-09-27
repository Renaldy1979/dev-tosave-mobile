import { useCallback, useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ExternalLink } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getNewsById } from "@/services";
import type { NewsItem } from "@/types";
import { openExternal } from "@/utils/openExternal";
import { formatNewsDateLong } from "@/utils/formatDate";
import { useDelayedFlag } from "@/hooks/useDelayedFlag";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Header } from "@/components/ui/Header";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { NewsImage } from "@/components/news/NewsImage";

type LoadState = "loading" | "ok" | "error" | "not-found";

/**
 * Detalhe da notícia (lote 1, `docs/PLANO-ENTREGA.md`). Stack fora do
 * drawer, igual a `car/[id]` e `serie/[id]`: imagem, título, data,
 * corpo e, se houver `link`, botão "Abrir matéria" no navegador.
 */
export default function NoticiaDetalhe() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id ?? "";
  const insets = useSafeAreaInsets();
  const { show } = useToast();

  const [news, setNews] = useState<NewsItem | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  const load = useCallback(async () => {
    if (!id) {
      setLoadState("not-found");
      return;
    }
    setLoadState("loading");
    try {
      const item = await getNewsById(id);
      if (!item) {
        setLoadState("not-found");
        setNews(null);
        return;
      }
      setNews(item);
      setLoadState("ok");
    } catch {
      setLoadState("error");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const showSkeleton = useDelayedFlag(loadState === "loading", 150);

  const handleOpenLink = useCallback(async () => {
    if (!news?.link) return;
    const ok = await openExternal(news.link);
    if (!ok) show({ type: "danger", message: "Não foi possível abrir o link." });
  }, [news, show]);

  if (loadState === "not-found") {
    return (
      <ScreenContainer bg="bg" edges={["top", "bottom"]} className="bg-bg">
        <Header variant="stack" title="Notícia" />
        <View className="flex-1 items-center justify-center px-8">
          <EmptyState
            kind="no-content"
            description="Essa notícia pode ter sido despublicada ou removida."
            action={{ label: "Voltar", onPress: () => router.replace("/(drawer)/noticias") }}
          />
        </View>
      </ScreenContainer>
    );
  }

  if (loadState === "error") {
    return (
      <ScreenContainer bg="bg" edges={["top", "bottom"]} className="bg-bg">
        <Header variant="stack" title="Notícia" />
        <View className="flex-1 items-center justify-center px-8">
          <ErrorState onRetry={load} />
        </View>
      </ScreenContainer>
    );
  }

  if (loadState === "loading" && showSkeleton) {
    return (
      <ScreenContainer bg="bg" edges={["bottom"]} className="bg-bg">
        <Header variant="stack" title="Carregando..." back />
        <View className="px-4 pt-4 gap-3">
          <Skeleton.Rect style={{ height: 200, width: "100%" }} />
          <Skeleton.Rect style={{ height: 12, width: "30%" }} />
          <Skeleton.Text lines={4} />
        </View>
      </ScreenContainer>
    );
  }

  if (!news) {
    return (
      <ScreenContainer bg="bg" edges={["top", "bottom"]} className="bg-bg">
        <Header variant="stack" title="Notícia" back />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer bg="bg" edges={["bottom"]} className="bg-bg">
      <Header variant="stack" title="Notícia" back />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {news.imagemFull ? (
          <NewsImage uri={news.imagemFull} width="100%" height={220} borderRadius={0} />
        ) : null}
        <View className="px-4 pt-5 gap-3">
          <Text variant="caption" tone="muted">
            {formatNewsDateLong(news.publishedAt)}
          </Text>
          <Text variant="display-md" className="font-display-black">
            {news.title}
          </Text>
          {news.content ? (
            <Text variant="body-lg" tone="muted" className="mt-2">
              {news.content}
            </Text>
          ) : null}
          {news.link ? (
            <Button
              label="Abrir matéria"
              variant="outline"
              size="lg"
              leftIcon={ExternalLink}
              onPress={handleOpenLink}
              className="mt-4 self-stretch"
            />
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
