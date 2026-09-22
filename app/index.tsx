import { Redirect } from "expo-router";
import { Text, View } from "react-native";

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-bg">
      <Text className="font-display-black text-display-lg text-fg">TOSAVE</Text>
      <Redirect href="/(tabs)" />
    </View>
  );
}
