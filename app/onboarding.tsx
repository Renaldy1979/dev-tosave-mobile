import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function Onboarding() {
  return (
    <View className="flex-1 items-center justify-center bg-ink">
      <Text className="font-display-black text-display-lg text-ink-fg">TOSAVE</Text>
      <Text className="mt-3 font-sans text-body text-fg-muted">
        Onboarding — 3 slides (em breve)
      </Text>
      <Pressable
        accessibilityRole="button"
        className="mt-8 min-h-11 items-center justify-center rounded-md bg-primary px-6"
        onPress={() => router.replace("/(tabs)")}
      >
        <Text className="font-sans-semibold text-body text-primary-fg">Começar</Text>
      </Pressable>
    </View>
  );
}
