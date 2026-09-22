import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

export default function CarDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View className="flex-1 items-center justify-center bg-bg px-4">
      <Text className="font-display text-h1 text-fg">Detalhe do carro</Text>
      <Text className="mt-2 font-mono text-body text-fg-muted">id: {id}</Text>
    </View>
  );
}
