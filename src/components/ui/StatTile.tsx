import { Pressable, View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "./Text";

/**
 * StatTile (componentes.md §C.12).
 *
 * Número grande em `display-xl font-display-black text-accent` (Saira
 * 800 itálico amarelo, identidade da marca) + label `caption` em
 * maiúsculas `fg-muted`. Usado no Perfil e na Coleção.
 *
 * `onPress` opcional: no Perfil leva a /colecao; ao tocar em
 * `highlight="duplicates"` ativa o filtro "Repetidos".
 */
type Props = {
  value: number | string;
  label: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  className?: string;
};

export function StatTile({ value, label, onPress, accessibilityLabel, className }: Props) {
  const Tag = onPress ? Pressable : View;
  return (
    <Tag
      accessibilityRole={onPress ? "button" : "text"}
      accessibilityLabel={accessibilityLabel ?? `${value} ${label.toLowerCase()}`}
      onPress={onPress}
      className={`items-center justify-center flex-1 ${onPress ? "active:opacity-80" : ""} ${className ?? ""}`}
    >
      <Text
        variant="display-xl"
        tone="accent"
        className="font-display-black leading-none"
      >
        {value}
      </Text>
      <Text variant="caption" tone="muted" className="uppercase mt-1 tracking-wider">
        {label}
      </Text>
    </Tag>
  );
}

/** Skeleton do StatTile para o estado "Carregando". */
export function StatTileSkeleton() {
  const { c } = useTheme();
  return (
    <View className="items-center justify-center flex-1 gap-1.5">
      <View
        className="rounded-md"
        style={{ width: 36, height: 24, backgroundColor: c("surface-3") }}
      />
      <View
        className="rounded-md"
        style={{ width: 56, height: 10, backgroundColor: c("surface-3") }}
      />
    </View>
  );
}
