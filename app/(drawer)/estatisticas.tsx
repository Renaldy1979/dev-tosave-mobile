import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, RefreshControl, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useFocusEffect, useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import {
  getSeriesProgress,
  getStatsSummary,
  getYearProgress,
  type SerieProgress,
  type StatsSummary,
  type YearProgress,
} from "@/services";
import { useDelayedFlag } from "@/hooks/useDelayedFlag";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Header } from "@/components/ui/Header";
import { Text } from "@/components/ui/Text";
import { Badge } from "@/components/ui/Badge";
import { StatTile, StatTileSkeleton } from "@/components/ui/StatTile";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ProgressBar, percentLabel } from "@/components/ui/ProgressBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { CarImage } from "@/components/car/CarImage";

type SortMode = "percent" | "name";
type Section<T> = { state: "loading" | "ok" | "error"; data: T };

// A ordenação escolhida fica em memória durante a sessão (§3).
let sessionSort: SortMode = "percent";

type Row =
  | { key: string; type: "summary" }
  | { key: string; type: "title"; text: string }
  | { key: string; type: "sort" }
  | { key: string; type: "serie"; item: SerieProgress; first: boolean; last: boolean }
  | { key: string; type: "year"; item: YearProgress; first: boolean; last: boolean }
  | { key: string; type: "seriesLink" }
  | { key: string; type: "skeletonRows" }
  | { key: string; type: "sectionError"; section: "series" | "years" }
  | { key: string; type: "empty" };

/**
 * Estatísticas (`docs/design/telas/11-estatisticas.md`): resumo em 4
 * StatTiles, progresso por série (só as começadas) e por ano (só os
 * anos com posse). Tudo contado no servidor (`services/stats.ts`).
 *
 * Uma única FlashList com as seções como itens. Cada seção carrega e
 * falha sozinha; se tudo falhar, ErrorState grande.
 */
export default function Estatisticas() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { show } = useToast();

  const [summary, setSummary] = useState<Section<StatsSummary | null>>({ state: "loading", data: null });
  const [series, setSeries] = useState<Section<SerieProgress[]>>({ state: "loading", data: [] });
  const [years, setYears] = useState<Section<YearProgress[]>>({ state: "loading", data: [] });
  const [sort, setSortState] = useState<SortMode>(sessionSort);
  const [refreshing, setRefreshing] = useState(false);

  const setSort = (next: SortMode) => {
    sessionSort = next;
    setSortState(next);
  };

  const loadSummary = useCallback(async (keep = false) => {
    if (!keep) setSummary({ state: "loading", data: null });
    try {
      setSummary({ state: "ok", data: await getStatsSummary() });
      return true;
    } catch {
      if (!keep) setSummary({ state: "error", data: null });
      return false;
    }
  }, []);

  const loadSeries = useCallback(async (keep = false) => {
    if (!keep) setSeries({ state: "loading", data: [] });
    try {
      setSeries({ state: "ok", data: await getSeriesProgress() });
      return true;
    } catch {
      if (!keep) setSeries({ state: "error", data: [] });
      return false;
    }
  }, []);

  const loadYears = useCallback(async (keep = false) => {
    if (!keep) setYears({ state: "loading", data: [] });
    try {
      setYears({ state: "ok", data: await getYearProgress() });
      return true;
    } catch {
      if (!keep) setYears({ state: "error", data: [] });
      return false;
    }
  }, []);

  const loadAll = useCallback(() => {
    void loadSummary();
    void loadSeries();
    void loadYears();
  }, [loadSummary, loadSeries, loadYears]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // O drawer mantém a tela montada: ao voltar a ela, relê em silêncio
  // (os contadores mudam quando um modelo entra ou sai da coleção).
  const focusedOnce = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!focusedOnce.current) {
        focusedOnce.current = true;
        return;
      }
      void loadSummary(true);
      void loadSeries(true);
      void loadYears(true);
    }, [loadSummary, loadSeries, loadYears])
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const results = await Promise.all([loadSummary(true), loadSeries(true), loadYears(true)]);
    setRefreshing(false);
    if (results.some((ok) => !ok)) show({ type: "danger", message: "Não foi possível atualizar." });
  }, [loadSummary, loadSeries, loadYears, show]);

  const sortedSeries = useMemo(() => {
    const list = [...series.data];
    if (sort === "name") {
      list.sort((a, b) => a.serie.title.localeCompare(b.serie.title));
    } else {
      const ratio = (p: SerieProgress) => (p.total > 0 ? p.owned / p.total : 0);
      list.sort(
        (a, b) =>
          ratio(b) - ratio(a) || b.owned - a.owned || a.serie.title.localeCompare(b.serie.title)
      );
    }
    return list;
  }, [series.data, sort]);

  const allFailed = summary.state === "error" && series.state === "error" && years.state === "error";
  const emptyCollection = summary.state === "ok" && (summary.data?.totalModels ?? 0) === 0;
  const anyLoading = summary.state === "loading" || series.state === "loading" || years.state === "loading";
  const showSkeleton = useDelayedFlag(anyLoading, 150);

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [{ key: "summary", type: "summary" }];
    if (emptyCollection) {
      out.push({ key: "empty", type: "empty" });
      return out;
    }
    out.push({ key: "t-series", type: "title", text: "Progresso por série" });
    if (series.state === "loading") {
      out.push({ key: "sk-series", type: "skeletonRows" });
    } else if (series.state === "error") {
      out.push({ key: "err-series", type: "sectionError", section: "series" });
    } else {
      if (sortedSeries.length > 0) out.push({ key: "sort", type: "sort" });
      sortedSeries.forEach((item, i) =>
        out.push({
          key: `s-${item.serie.id}`,
          type: "serie",
          item,
          first: i === 0,
          last: i === sortedSeries.length - 1,
        })
      );
      out.push({ key: "series-link", type: "seriesLink" });
    }
    out.push({ key: "t-years", type: "title", text: "Por ano" });
    if (years.state === "loading") {
      out.push({ key: "sk-years", type: "skeletonRows" });
    } else if (years.state === "error") {
      out.push({ key: "err-years", type: "sectionError", section: "years" });
    } else {
      years.data.forEach((item, i) =>
        out.push({
          key: `y-${item.year}`,
          type: "year",
          item,
          first: i === 0,
          last: i === years.data.length - 1,
        })
      );
    }
    return out;
  }, [emptyCollection, series.state, sortedSeries, years]);

  const renderSummary = () => {
    if (summary.state === "error") {
      return <ErrorState size="sm" onRetry={() => loadSummary()} />;
    }
    if (summary.state === "loading" || !summary.data) {
      if (!showSkeleton) return <View style={{ height: 200 }} />;
      return (
        <View className="rounded-lg bg-surface border border-border p-3 gap-3">
          <View className="flex-row">
            <StatTileSkeleton />
            <StatTileSkeleton />
          </View>
          <View className="flex-row">
            <StatTileSkeleton />
            <StatTileSkeleton />
          </View>
        </View>
      );
    }
    const s = summary.data;
    const share = catalogShare(s.totalModels, s.catalogTotal);
    return (
      <View className="rounded-lg bg-surface border border-border p-3 gap-3">
        <View className="flex-row">
          <StatTile
            value={s.totalItems}
            label="Unidades"
            accessibilityLabel={`${s.totalItems} unidades na coleção`}
          />
          <StatTile
            value={s.totalModels}
            label="Modelos"
            accessibilityLabel={`${s.totalModels} modelos na coleção`}
          />
        </View>
        <View className="flex-row">
          <StatTile
            value={s.duplicates}
            label="Repetidos"
            onPress={() => router.navigate("/colecao?dup=1")}
            accessibilityLabel={`${s.duplicates} modelos repetidos, toque para ver`}
          />
          <StatTile
            value={share.text}
            label="Do catálogo"
            accessibilityLabel={`${share.spoken} do catálogo`}
          />
        </View>
      </View>
    );
  };

  const renderRow = ({ item }: { item: Row }) => {
    switch (item.type) {
      case "summary":
        return renderSummary();
      case "title":
        return (
          <Text variant="h2" className="mt-8 mb-3">
            {item.text}
          </Text>
        );
      case "sort":
        return (
          <SegmentedControl
            className="mb-3"
            options={[
              { value: "percent", label: "Maior %", accessibilityLabel: "Maior porcentagem" },
              { value: "name", label: "Nome" },
            ]}
            value={sort}
            onChange={setSort}
            accessibilityLabel="Ordenar séries"
          />
        );
      case "serie":
        return (
          <ProgressRow
            first={item.first}
            last={item.last}
            owned={item.item.owned}
            total={item.item.total}
            title={item.item.serie.title}
            image={item.item.serie.imagem || null}
            accessibilityLabel={`${item.item.serie.title}, ${item.item.owned} de ${item.item.total}, ${percentLabel(item.item.owned, item.item.total)} por cento`}
            accessibilityHint="Mostra as miniaturas que faltam"
            onPress={() => router.push(`/serie/${item.item.serie.id}?filtro=faltam`)}
          />
        );
      case "seriesLink":
        return (
          <View className="items-end">
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Ver todas as séries"
              onPress={() => router.navigate("/series")}
              hitSlop={8}
              className="flex-row items-center gap-1 active:opacity-70"
              style={{ minHeight: 44 }}
            >
              <Text variant="body-sm" tone="primary" className="font-sans-medium">
                Ver todas as séries
              </Text>
              <ChevronRight size={16} color={c("primary-text")} strokeWidth={1.75} />
            </Pressable>
          </View>
        );
      case "year":
        return (
          <ProgressRow
            first={item.first}
            last={item.last}
            owned={item.item.owned}
            total={item.item.total}
            title={String(item.item.year)}
            titleIsYear
            accessibilityLabel={`${item.item.year}: ${item.item.owned} de ${item.item.total} miniaturas, ${percentLabel(item.item.owned, item.item.total)} por cento`}
            onPress={() => router.navigate(`/busca?year=${item.item.year}`)}
          />
        );
      case "skeletonRows":
        return showSkeleton ? (
          <View className="rounded-lg bg-surface border border-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <View
                key={i}
                className={`px-3 py-2.5 gap-2 ${i > 0 ? "border-t border-border" : ""}`}
                style={{ minHeight: 64 }}
              >
                <Skeleton.Rect style={{ height: 14, width: "60%" }} />
                <Skeleton.Rect style={{ height: 6, width: "100%" }} />
              </View>
            ))}
          </View>
        ) : null;
      case "sectionError":
        return (
          <ErrorState
            size="sm"
            onRetry={() => (item.section === "series" ? loadSeries() : loadYears())}
          />
        );
      case "empty":
        return (
          <View className="pt-8 items-center">
            <EmptyState
              kind="no-cars"
              description="Adicione miniaturas à sua coleção para ver seu progresso."
              action={{ label: "Explorar miniaturas", onPress: () => router.navigate("/busca") }}
            />
          </View>
        );
    }
  };

  return (
    <ScreenContainer bg="bg" edges={["bottom"]} className="bg-bg">
      <Header variant="root" title="Estatísticas" />
      {allFailed ? (
        <View className="flex-1 items-center justify-center px-8">
          <ErrorState onRetry={loadAll} />
        </View>
      ) : (
        <FlashList
          data={rows}
          keyExtractor={(row) => row.key}
          getItemType={(row) => row.type}
          extraData={{ summary, showSkeleton, sort }}
          renderItem={renderRow}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: insets.bottom + 24,
          }}
          refreshControl={
            <RefreshControl tintColor={c("primary")} refreshing={refreshing} onRefresh={refresh} />
          }
        />
      )}
    </ScreenContainer>
  );
}

/** "3,7%" · "< 0,1%" (maior que zero) · "0%"; e a versão falada. */
function catalogShare(models: number, total: number): { text: string; spoken: string } {
  if (models <= 0 || total <= 0) return { text: "0%", spoken: "0 por cento" };
  const pct = (models / total) * 100;
  if (pct < 0.1) return { text: "< 0,1%", spoken: "menos de 0,1 por cento" };
  const value = pct.toFixed(1).replace(".", ",");
  return { text: `${value}%`, spoken: `${value} por cento` };
}

/**
 * Linha de progresso (série ou ano) dentro de um card com divisórias
 * hairline: `first`/`last` arredondam as pontas.
 */
function ProgressRow({
  first,
  last,
  owned,
  total,
  title,
  titleIsYear = false,
  image,
  accessibilityLabel,
  accessibilityHint,
  onPress,
}: {
  first: boolean;
  last: boolean;
  owned: number;
  total: number;
  title: string;
  titleIsYear?: boolean;
  image?: string | null;
  accessibilityLabel: string;
  accessibilityHint?: string;
  onPress: () => void;
}) {
  const complete = total > 0 && owned >= total;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      className={[
        "bg-surface border-x border-border px-3 py-2.5 gap-1.5 active:bg-surface-3",
        first ? "border-t rounded-t-lg" : "border-t",
        last ? "border-b rounded-b-lg" : "",
      ].join(" ")}
      style={{ minHeight: 64 }}
    >
      <View className="flex-row items-center gap-3">
        {image !== undefined ? (
          <CarImage
            uri={image}
            contentFit="contain"
            bgClassName="bg-surface"
            placeholderScale="80%"
            style={{ width: 40, height: 40 }}
          />
        ) : null}
        {titleIsYear ? (
          <Text variant="h3" className="font-display flex-1">
            {title}
          </Text>
        ) : (
          <Text variant="body" className="font-sans-medium flex-1" numberOfLines={1}>
            {title}
          </Text>
        )}
        <Text variant="body-sm" className="font-mono">
          {owned}/{total}
        </Text>
      </View>
      <View className="flex-row items-center gap-3">
        <ProgressBar value={owned} max={total} className="flex-1" />
        {complete ? (
          <Badge variant="accent" size="sm">
            Completa
          </Badge>
        ) : (
          <Text variant="caption" tone="muted">
            {percentLabel(owned, total)}%
          </Text>
        )}
      </View>
    </Pressable>
  );
}
