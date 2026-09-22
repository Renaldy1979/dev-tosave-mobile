import { Tabs } from "expo-router";
import { Heart, Home, Search, User } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";

export { ErrorBoundary } from "expo-router";

export default function TabsLayout() {
  const { c } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c("primary-text"),
        tabBarInactiveTintColor: c("fg-subtle"),
        tabBarStyle: { backgroundColor: c("ink"), borderTopColor: c("border") },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Início",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="busca"
        options={{
          title: "Buscar",
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="colecao"
        options={{
          title: "Coleção",
          tabBarIcon: ({ color, size }) => <Heart color={color} size={size} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => <User color={color} size={size} strokeWidth={1.75} />,
        }}
      />
    </Tabs>
  );
}
