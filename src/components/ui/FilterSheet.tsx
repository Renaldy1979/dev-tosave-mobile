import { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Check } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme/ThemeProvider";
import { cn } from "@/utils/cn";
import { Text } from "./Text";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { Button } from "./Button";
import { BottomSheet } from "./BottomSheet";
import { Skeleton } from "./Skeleton";
import type { Attribute, Brand, Serie } from "@/types";

/**
 * FilterSheet (componentes.md §12.3).
 *
 * BottomSheet com 4 seções (Ano, Série, Marca, Atributos) + (opcional)
 * Repetidos para a Coleção. Cada seção lista os 8 primeiros como
 * chips grandes (44 pt de toque) e expande inline se houver mais.
 *
 * Seleções são **rascunho**: só se aplicam ao tocar "Ver N resultados".
 * "Limpar" reseta o rascunho. Fechar sem confirmar descarta.
 *
 * Props:
 * - `open` e `onClose` controlam o sheet.
 * - `draft` é o rascunho de filtros; `onApply` recebe o novo filtro
 *    quando o usuário confirma; `onClear` reseta o rascunho e o filtro aplicado.
 * - `data` traz as opções (anos, séries, marcas, atributos).
 * - `liveCount` é uma função que devolve o número de resultados
 *    dado um rascunho (usado no botão "Ver N resultados").
 * - `openSection` permite abrir já em uma seção específica.
 */
export type FilterDraft = {
  years: number[];
  serieId: string | null;
  brandId: string | null;
  attributeIds: string[];
  duplicatesOnly?: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  draft: FilterDraft;
  onApply: (next: FilterDraft) => void;
  onClear: () => void;
  data: {
    years: number[];
    series: Serie[];
    brands: Brand[];
    attributes: Attribute[];
  };
  dataState?: {
    years?: LoadState;
    series?: LoadState;
    brands?: LoadState;
    attributes?: LoadState;
  };
  onRetryLoad?: () => void;
  liveCount: (next: FilterDraft) => number;
  /** Quando fornecido, "Limpar" também limpa a coleção; duplicatasOnly some sem essa prop. */
  showDuplicates?: boolean;
  initialSection?: "year" | "serie" | "brand" | "attr";
};

type LoadState = "loading" | "ok" | "error" | "empty";

export function FilterSheet({
  open,
  onClose,
  draft,
  onApply,
  onClear,
  data,
  dataState,
  onRetryLoad,
  liveCount,
  showDuplicates = false,
  initialSection,
}: Props) {
  const { c } = useTheme();
  const [local, setLocal] = useState<FilterDraft>(draft);

  // Sempre que o sheet abre, sincroniza o rascunho com o filtro aplicado.
  useEffect(() => {
    if (open) {
      setLocal(draft);
    }
  }, [open, draft]);

  const count = useMemo(() => liveCount(local), [local, liveCount]);

  const handleApply = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    onApply(local);
    onClose();
  };

  const handleClear = () => {
    setLocal({ years: [], serieId: null, brandId: null, attributeIds: [], duplicatesOnly: false });
    onClear();
    onClose();
  };

  const toggleYear = (year: number) => {
    setLocal((cur) => {
      const exists = cur.years.includes(year);
      const next = exists ? cur.years.filter((y) => y !== year) : [...cur.years, year];
      return { ...cur, years: next };
    });
  };
  const toggleAttribute = (id: string) => {
    setLocal((cur) => {
      const exists = cur.attributeIds.includes(id);
      const next = exists
        ? cur.attributeIds.filter((a) => a !== id)
        : [...cur.attributeIds, id];
      return { ...cur, attributeIds: next };
    });
  };
  const setSerie = (id: string | null) => setLocal((cur) => ({ ...cur, serieId: id }));
  const setBrand = (id: string | null) => setLocal((cur) => ({ ...cur, brandId: id }));

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Filtros"
      snapPoints={["90%"]}
      footer={
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button label="Limpar" variant="ghost" size="md" fullWidth onPress={handleClear} />
          </View>
          <View className="flex-[2]">
            <Button
              label={
                count === 0
                  ? "Nenhum resultado"
                  : `Ver ${count} ${count === 1 ? "resultado" : "resultados"}`
              }
              variant="primary"
              size="md"
              fullWidth
              disabled={count === 0}
              onPress={handleApply}
            />
          </View>
        </View>
      }
    >
      <View className="pb-4">
        <Section
          title="Ano"
          eyebrowHighlight={initialSection === "year"}
          count={local.years.length}
        >
          <ChipsRow>
            {dataState?.years === "loading" ? (
              <SkeletonChips count={4} />
            ) : dataState?.years === "error" ? (
              <ErrorState
                size="sm"
                title="Não foi possível carregar."
                onRetry={onRetryLoad}
              />
            ) : data.years.length === 0 ? (
              <EmptyState kind="no-content" size="sm" />
            ) : (
              data.years.map((year) => (
                <SelectableChip
                  key={year}
                  label={String(year)}
                  selected={local.years.includes(year)}
                  onPress={() => toggleYear(year)}
                />
              ))
            )}
          </ChipsRow>
        </Section>

        <Section
          title="Série"
          eyebrowHighlight={initialSection === "serie"}
          count={local.serieId ? 1 : 0}
        >
          {dataState?.series === "loading" ? (
            <SkeletonChips count={4} />
          ) : dataState?.series === "error" ? (
            <ErrorState
              size="sm"
              title="Não foi possível carregar."
              onRetry={onRetryLoad}
            />
          ) : data.series.length === 0 ? (
            <EmptyState kind="no-content" size="sm" />
          ) : (
            <ChipsRow>
              {data.series.map((serie) => (
                <SelectableChip
                  key={serie.id}
                  label={serie.title}
                  selected={local.serieId === serie.id}
                  onPress={() => setSerie(local.serieId === serie.id ? null : serie.id)}
                />
              ))}
            </ChipsRow>
          )}
        </Section>

        <Section
          title="Marca"
          eyebrowHighlight={initialSection === "brand"}
          count={local.brandId ? 1 : 0}
        >
          {dataState?.brands === "loading" ? (
            <SkeletonChips count={4} />
          ) : dataState?.brands === "error" ? (
            <ErrorState
              size="sm"
              title="Não foi possível carregar."
              onRetry={onRetryLoad}
            />
          ) : data.brands.length === 0 ? (
            <EmptyState kind="no-content" size="sm" />
          ) : (
            <ChipsRow>
              {data.brands.map((brand) => (
                <SelectableChip
                  key={brand.id}
                  label={brand.name}
                  selected={local.brandId === brand.id}
                  onPress={() => setBrand(local.brandId === brand.id ? null : brand.id)}
                />
              ))}
            </ChipsRow>
          )}
        </Section>

        <Section
          title="Atributos"
          eyebrowHighlight={initialSection === "attr"}
          count={local.attributeIds.length}
        >
          {dataState?.attributes === "loading" ? (
            <SkeletonChips count={6} />
          ) : dataState?.attributes === "error" ? (
            <ErrorState
              size="sm"
              title="Não foi possível carregar."
              onRetry={onRetryLoad}
            />
          ) : data.attributes.length === 0 ? (
            <EmptyState kind="no-content" size="sm" />
          ) : (
            <ChipsRow>
              {data.attributes.map((attr) => (
                <SelectableChip
                  key={attr.id}
                  label={attr.title}
                  selected={local.attributeIds.includes(attr.id)}
                  onPress={() => toggleAttribute(attr.id)}
                />
              ))}
            </ChipsRow>
          )}
        </Section>

        {showDuplicates ? (
          <Section title="Repetidos" count={local.duplicatesOnly ? 1 : 0}>
            <Pressable
              accessibilityRole="switch"
              accessibilityState={{ checked: Boolean(local.duplicatesOnly) }}
              onPress={() =>
                setLocal((cur) => ({ ...cur, duplicatesOnly: !cur.duplicatesOnly }))
              }
              className="flex-row items-center gap-3 min-h-11 px-2 active:opacity-80"
            >
              <View
                className="rounded-full items-center justify-center"
                style={{
                  width: 24,
                  height: 24,
                  backgroundColor: local.duplicatesOnly ? c("primary") : "transparent",
                  borderWidth: 2,
                  borderColor: local.duplicatesOnly ? c("primary") : c("border-strong"),
                }}
              >
                {local.duplicatesOnly ? (
                  <Check color={c("primary-fg")} size={14} strokeWidth={2} />
                ) : null}
              </View>
              <Text variant="body" className="flex-1">
                Apenas repetidos
              </Text>
            </Pressable>
          </Section>
        ) : null}
      </View>
    </BottomSheet>
  );
}

/* ================================================================== */
/*                          SUB-COMPONENTES                            */
/* ================================================================== */

function Section({
  title,
  count,
  eyebrowHighlight,
  children,
}: {
  title: string;
  count: number;
  eyebrowHighlight?: boolean;
  children: React.ReactNode;
}) {
  const { c } = useTheme();
  return (
    <View className="mt-6">
      <View
        className="flex-row items-center gap-2 px-5 mb-2"
        accessibilityRole="header"
      >
        <Text variant="eyebrow" tone="subtle" className="font-sans-medium">
          {title.toUpperCase()}
        </Text>
        {count > 0 ? (
          <View
            className="rounded-full px-2 h-5 items-center justify-center"
            style={{ backgroundColor: c("primary-soft") }}
          >
            <Text variant="caption" tone="primary" className="font-sans-semibold">
              {count}
            </Text>
          </View>
        ) : null}
        {eyebrowHighlight ? (
          <View style={{ height: 2, width: 24, backgroundColor: c("primary") }} />
        ) : null}
      </View>
      {children}
    </View>
  );
}

function ChipsRow({ children }: { children: React.ReactNode }) {
  return <View className="flex-row flex-wrap gap-2 px-5">{children}</View>;
}

function SelectableChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      className={cn(
        "flex-row items-center gap-1.5 rounded-sm px-3 h-11 border active:opacity-90",
        selected ? "bg-primary-soft border-primary/60" : "bg-surface border-border-strong"
      )}
    >
      {selected ? (
        <Check color={c("primary-text")} size={14} strokeWidth={1.75} />
      ) : null}
      <Text
        variant="body-sm"
        tone={selected ? "primary" : "fg"}
        className={selected ? "font-sans-medium" : "font-sans"}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SkeletonChips({ count }: { count: number }) {
  const { c } = useTheme();
  return (
    <View className="flex-row flex-wrap gap-2 px-5">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton.Rect
          key={i}
          style={{
            width: 60 + (i % 3) * 30,
            height: 36,
            backgroundColor: c("surface-3"),
          }}
        />
      ))}
    </View>
  );
}
