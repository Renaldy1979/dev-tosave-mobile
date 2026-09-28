import { StyleSheet } from "react-native";
import { Tabs } from "expo-router";
import { Heart, Home, Menu, Newspaper, Search } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";

/**
 * Barra inferior (`docs/briefings/navegacao-mais.md`): Início, Buscar,
 * Coleção, Notícias e Mais. As telas fora da barra (Séries, Clube da
 * Troca, Estatísticas, Notificações, Perfil) vivem na pilha própria da
 * aba Mais (`app/(tabs)/mais/`). Cada tela desenha o próprio header
 * (`Header variant="root"`/`"stack"`), por isso `headerShown: false`.
 *
 * `backBehavior="initialRoute"`: o voltar do Android em qualquer aba
 * que não seja o Início volta para o Início.
 *
 * A guarda de sessão é a única do app: o `AuthGate` do `_layout` raiz.
 */
export default function TabsLayout() {
  const { c, scheme } = useTheme();

  return (
    <Tabs
      backBehavior="initialRoute"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c("primary-text"),
        tabBarInactiveTintColor: c("fg-muted"),
        tabBarStyle: {
          backgroundColor: c("surface"),
          borderTopColor: c("border"),
          borderTopWidth: scheme === "dark" ? StyleSheet.hairlineWidth : 0,
        },
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
        name="noticias"
        options={{
          title: "Notícias",
          tabBarIcon: ({ color, size }) => <Newspaper color={color} size={size} strokeWidth={1.75} />,
        }}
      />
      <Tabs.Screen
        name="mais"
        options={{
          title: "Mais",
          tabBarIcon: ({ color, size }) => <Menu color={color} size={size} strokeWidth={1.75} />,
        }}
      />
    </Tabs>
  );
}
