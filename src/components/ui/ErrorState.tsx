import { AlertCircle, RotateCw } from "lucide-react-native";
import { View } from "react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { cn } from "@/utils/cn";
import { Text } from "./Text";
import { Button } from "./Button";

/**
 * ErrorState (`componentes.md §C.10`). Igual ao EmptyState `lg`, mas
 * com ícone `AlertCircle` em círculo `flame-soft`, título
 * "Não foi possível carregar." e descrição padrão de conexão.
 *
 * Versão `sm` para seções (sem círculo, sem descrição longa).
 */
type Props = {
  size?: "lg" | "sm";
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
};

export function ErrorState({
  size = "lg",
  title = "Não foi possível carregar.",
  description = "Verifique sua conexão e tente novamente.",
  onRetry,
  className,
}: Props) {
  const { c } = useTheme();

  if (size === "sm") {
    return (
      <View className={cn("items-center gap-2 py-6 px-6", className)}>
        <AlertCircle color={c("flame")} size={24} strokeWidth={1.75} />
        <Text variant="body-sm" tone="muted" className="text-center">
          {title}
        </Text>
        {onRetry ? (
          <Button
            label="Tentar novamente"
            variant="secondary"
            size="sm"
            leftIcon={RotateCw}
            onPress={onRetry}
            className="mt-2"
          />
        ) : null}
      </View>
    );
  }

  return (
    <View className={cn("items-center px-8 py-16 gap-3 self-center", className)} style={{ maxWidth: 320 }}>
      <View
        className="rounded-full items-center justify-center"
        style={{ width: 88, height: 88, backgroundColor: c("flame-soft") }}
      >
        <AlertCircle color={c("flame")} size={36} strokeWidth={1.75} />
      </View>
      <Text variant="h3" className="text-center mt-2">
        {title}
      </Text>
      <Text variant="body-sm" tone="muted" className="text-center">
        {description}
      </Text>
      {onRetry ? (
        <Button
          label="Tentar novamente"
          variant="secondary"
          size="md"
          leftIcon={RotateCw}
          onPress={onRetry}
          className="mt-2 self-stretch"
        />
      ) : null}
    </View>
  );
}
