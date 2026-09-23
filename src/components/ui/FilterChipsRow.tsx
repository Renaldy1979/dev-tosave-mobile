import { Pressable, ScrollView, View } from "react-native";
import { Check, ChevronDown, X } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme/ThemeProvider";
import { cn } from "@/utils/cn";
import { Text } from "./Text";

/**
 * FilterChip (componentes.md §12.1).
 *
 * Tipos:
 * - `toggle`    → checkbox (chip selecionado com `Check` à esquerda).
 * - `dropdown`  → abre FilterSheet (`ChevronDown` à direita; valor
 *                 opcional "Série: J-Imports" ou contador).
 * - `removable` → chip de filtro aplicado (`X` à direita; remove o
 *                 filtro com um toque).
 */
type Props = {
  label: string;
  selected?: boolean;
  count?: number;
  kind?: "toggle" | "dropdown" | "removable";
  onPress: () => void;
  accessibilityLabel?: string;
  className?: string;
};

function hitSlopFor(box: number) {
  const diff = Math.max(0, 44 - box);
  return { top: diff / 2, bottom: diff / 2, left: diff / 2, right: diff / 2 };
}

export function FilterChip({
  label,
  selected = false,
  count,
  kind = "toggle",
  onPress,
  accessibilityLabel,
  className,
}: Props) {
  const { c } = useTheme();

  const handlePress = () => {
    Haptics.selectionAsync().catch(() => undefined);
    onPress();
  };

  const containerClass = selected
    ? "bg-primary-soft border-primary/60"
    : "bg-surface border-border-strong";

  const textTone = selected ? "primary" : "fg";
  const textClass = selected ? "font-sans-medium" : "font-sans";

  const role =
    kind === "toggle"
      ? ("checkbox" as const)
      : ("button" as const);

  return (
    <Pressable
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={kind === "toggle" ? { checked: selected } : { selected }}
      hitSlop={hitSlopFor(36)}
      onPress={handlePress}
      className={cn(
        "flex-row items-center gap-1.5 rounded-sm px-3 border h-9 active:opacity-90",
        containerClass,
        className
      )}
    >
      {kind === "toggle" && selected ? (
        <Check color={c("primary-text")} size={14} strokeWidth={1.75} />
      ) : null}
      {kind === "dropdown" ? (
        <ChevronDown color={c(selected ? "primary-text" : "fg-muted")} size={14} strokeWidth={1.75} />
      ) : null}
      <Text variant="body-sm" tone={textTone} className={textClass} numberOfLines={1}>
        {label}
      </Text>
      {typeof count === "number" && count > 0 ? (
        <View
          className={cn(
            "rounded-full px-1.5 h-5 items-center justify-center",
            selected ? "bg-primary/30" : "bg-surface-3"
          )}
        >
          <Text
            variant="caption"
            tone={selected ? "primary" : "muted"}
            className="font-sans-semibold"
          >
            {count > 99 ? "99+" : count}
          </Text>
        </View>
      ) : null}
      {kind === "removable" ? (
        <X color={c(selected ? "primary-text" : "fg-muted")} size={14} strokeWidth={1.75} />
      ) : null}
    </Pressable>
  );
}

/**
 * FilterChipsRow (componentes.md §12.2).
 *
 * Linha horizontal rolável de chips. Primeiro chip = "Filtros" com
 * contador. Demais chips passados em `items` (kind dropdown/removable).
 * Chip "Limpar" aparece ao final quando há filtro ativo.
 */
export type FilterChipItem = {
  key: string;
  label: string;
  count?: number;
  selected?: boolean;
  kind?: "dropdown" | "removable";
  onPress: () => void;
  accessibilityLabel?: string;
};

type RowProps = {
  activeFiltersCount: number;
  onOpenFilters: () => void;
  items: FilterChipItem[];
  onClear?: () => void;
  className?: string;
};

export function FilterChipsRow({
  activeFiltersCount,
  onOpenFilters,
  items,
  onClear,
  className,
}: RowProps) {
  const { c } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName={cn("px-4 gap-2 items-center", className)}
    >
      <FilterChip
        label="Filtros"
        kind="dropdown"
        count={activeFiltersCount}
        selected={activeFiltersCount > 0}
        onPress={onOpenFilters}
        accessibilityLabel={`Filtros, ${activeFiltersCount} ativo${activeFiltersCount === 1 ? "" : "s"}`}
      />
      {items.map((item) => (
        <FilterChip
          key={item.key}
          label={item.label}
          kind={item.kind ?? "dropdown"}
          count={item.count}
          selected={item.selected}
          onPress={item.onPress}
          accessibilityLabel={item.accessibilityLabel}
        />
      ))}
      {onClear && activeFiltersCount > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Limpar filtros"
          onPress={onClear}
          hitSlop={12}
          className="flex-row items-center gap-1 px-2 py-1 active:opacity-70"
        >
          <X color={c("fg-muted")} size={14} strokeWidth={1.75} />
          <Text variant="body-sm" tone="muted" className="font-sans-medium">
            Limpar
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}
