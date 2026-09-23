import { View } from "react-native";
import { Palette } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "./Text";

/**
 * ColorBadge (componentes.md §5).
 *
 * Dot 10 pt com o hex da cor do carro (borda hairline `border-strong`)
 * + nome. Quando `color` não é hex válido (a spec define nome humano
 * como "Azul", "Vermelho"…), cai para o ícone `Palette` + texto.
 */
type Props = {
  color: string;
  className?: string;
};

function isHex(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

export function ColorBadge({ color, className }: Props) {
  const { c } = useTheme();
  if (isHex(color)) {
    return (
      <View className={`flex-row items-center gap-2 ${className ?? ""}`}>
        <View
          style={{
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: color,
            borderWidth: 1,
            borderColor: c("border-strong"),
          }}
        />
        <Text variant="body" className="font-sans-medium" numberOfLines={1}>
          {color}
        </Text>
      </View>
    );
  }
  return (
    <View className={`flex-row items-center gap-2 ${className ?? ""}`}>
      <Palette color={c("fg-subtle")} size={14} strokeWidth={1.75} />
      <Text variant="body" numberOfLines={1}>
        {color}
      </Text>
    </View>
  );
}
