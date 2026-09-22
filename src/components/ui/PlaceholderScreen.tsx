import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Car } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";

/** Placeholder reutilizável para exercitar src/components/ui/ enquanto as telas não têm conteúdo. */
export function PlaceholderScreen({ title }: { title: string }) {
  const { c } = useTheme();

  return (
    <View className="flex-1 items-center justify-center gap-3 bg-bg px-4">
      <Car color={c("fg-subtle")} size={40} strokeWidth={1.75} />
      <Text className="font-display text-h2 text-fg">{title}</Text>
      <Text className="text-center font-sans text-body text-fg-muted">
        Tela em construção — navegação e tema já funcionando.
      </Text>
      <Pressable
        accessibilityRole="button"
        className="mt-2 min-h-11 items-center justify-center rounded-md bg-surface-3 px-6"
        onPress={() => router.push("/car/mock-001")}
      >
        <Text className="font-sans-semibold text-body text-fg">Abrir detalhe (mock)</Text>
      </Pressable>
    </View>
  );
}
