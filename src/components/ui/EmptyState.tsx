import { View } from "react-native";
import { Car, Inbox } from "lucide-react-native";
import Svg, { Path } from "react-native-svg";
import type { LucideIcon } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { cn } from "@/utils/cn";
import { Text } from "./Text";
import { Button } from "./Button";

/**
 * Texto oficial dos empty states (`design-system-mobile.md §13`). Não
 * editar: é o vocabulário validado do produto.
 */
const TITLES = {
  "no-cars": "Nenhuma miniatura disponível no momento.",
  "no-content": "Nenhum conteúdo disponível.",
} as const;

const ICONS: Record<keyof typeof TITLES, LucideIcon> = {
  "no-cars": Car,
  "no-content": Inbox,
};

type Props = {
  kind: keyof typeof TITLES;
  description?: string;
  action?: { label: string; onPress: () => void; icon?: LucideIcon };
  size?: "lg" | "sm";
  className?: string;
};

/**
 * EmptyState (`componentes.md §10`).
 * - `lg` → tela cheia: ilustração (círculo 88 pt com ícone 36 + arco
 *   flame), título, descrição e ação.
 * - `sm` → dentro de sheet/seção: ícone 24 sem círculo, título `body-sm`.
 *
 * O arco flame é o detalhe de marca pedido no §10. Renderizado como
 * SVG inline (não há arquivo de asset).
 */
export function EmptyState({ kind, description, action, size = "lg", className }: Props) {
  const { c } = useTheme();
  const Icon = ICONS[kind];
  const title = TITLES[kind];

  if (size === "sm") {
    return (
      <View className={cn("items-center gap-2 py-8 px-6", className)}>
        <Icon color={c("fg-subtle")} size={24} strokeWidth={1.75} />
        <Text variant="body-sm" tone="muted" className="text-center">
          {title}
        </Text>
        {description ? (
          <Text variant="caption" tone="muted" className="text-center">
            {description}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View className={cn("items-center px-8 py-16 gap-3 self-center", className)} style={{ maxWidth: 320 }}>
      <View className="items-center justify-center" style={{ width: 88, height: 88 }}>
        <View
          className="rounded-full border border-border bg-surface-2 items-center justify-center"
          style={{ width: 88, height: 88 }}
        >
          <Icon color={c("fg-subtle")} size={36} strokeWidth={1.75} />
        </View>
        {/* arco flame SVG sobreposto, cobrindo ~1/3 da borda */}
        <Svg width={88} height={88} style={{ position: "absolute" }} pointerEvents="none">
          <Path
            d="M 4 80 A 40 40 0 0 1 84 70"
            stroke="#FD8401"
            strokeWidth={2}
            fill="none"
          />
          <Path
            d="M 30 84 A 40 40 0 0 1 88 60"
            stroke="#FF0000"
            strokeWidth={2}
            fill="none"
            opacity={0.7}
          />
        </Svg>
      </View>
      <Text variant="h3" className="text-center mt-2">
        {title}
      </Text>
      {description ? (
        <Text variant="body-sm" tone="muted" className="text-center">
          {description}
        </Text>
      ) : null}
      {action ? (
        <Button
          label={action.label}
          variant="outline"
          size="md"
          leftIcon={action.icon}
          onPress={action.onPress}
          className="mt-2 self-stretch"
        />
      ) : null}
    </View>
  );
}
