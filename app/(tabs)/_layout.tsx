import { Tabs } from "expo-router";
import { Heart, Home, Search, User } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * TabBar do expo-router (`componentes.md §6`).
 *
 * Fase 2: o app é travado — sem login não se navega. Por isso a aba
 * "Perfil" é sempre "Perfil" (não alterna com "Entrar"), e não há
 * nenhum interceptador de `tabPress` pedindo login. Quem decide se
 * mostra a tab ou redireciona para `/login` é o `_layout.tsx` (no
 * nível do Stack): se a sessão cair, volta para `/login`.
 */
export default function TabsLayout() {
  const { c } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c("primary-text"),
        tabBarInactiveTintColor: c("fg-subtle"),
        tabBarStyle: { backgroundColor: c("ink"), borderTopColor: c("border") },
        tabBarHideOnKeyboard: true,
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
