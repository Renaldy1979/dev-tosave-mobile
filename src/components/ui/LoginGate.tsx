import { View } from "react-native";
import { Lock } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { useRequireSession } from "@/hooks/useRequireSession";
import { Button } from "./Button";
import { Text } from "./Text";

/**
 * LoginGate (componentes.md §C.16).
 *
 * Fallback de Coleção e Perfil abertos via deep link sem sessão. Mostra
 * um aviso com botão "Entrar" em vez de redirecionar — evita loop.
 *
 * Não substitui os empty states oficiais: só aparece quando falta
 * sessão.
 */
type Props = {
  title: string;
  description?: string;
  /** Rota para onde ir depois do login (ex.: "/colecao" ou "/perfil"). */
  next: string;
  buttonLabel?: string;
};

export function LoginGate({ title, description, next, buttonLabel = "Entrar" }: Props) {
  const { c } = useTheme();
  const requireSession = useRequireSession();

  return (
    <View className="flex-1 items-center justify-center px-8 gap-3 bg-bg" style={{ maxWidth: 360, alignSelf: "center" }}>
      <View
        className="rounded-full items-center justify-center bg-flame-soft"
        style={{ width: 88, height: 88 }}
      >
        <Lock color={c("flame")} size={36} strokeWidth={1.75} />
      </View>
      <Text variant="h3" className="text-center mt-2">
        {title}
      </Text>
      {description ? (
        <Text variant="body-sm" tone="muted" className="text-center">
          {description}
        </Text>
      ) : null}
      <Button
        label={buttonLabel}
        variant="primary"
        size="md"
        onPress={() => requireSession({ next })}
        className="mt-2 self-stretch"
      />
    </View>
  );
}
