import { useEffect, useState } from "react";
import { Tabs, useRouter } from "expo-router";
import { Heart, Home, LogIn, Search, User } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { getCollection } from "@/services/collection";
import type { CollectionItemWithCar } from "@/types";

/**
 * TabBar do expo-router (`componentes.md §6`).
 *
 * - Container `bg-ink` (ink nos dois temas).
 * - Perfil vira "Entrar" sem sessão (com `LogIn`).
 * - Coleção mostra o total de itens como badge nativo do expo-router
 *   (`tabBarBadge`), atualizado quando a coleção muda.
 * - `tabPress` de Coleção/Perfil sem sessão: preventDefault + abre
 *   `/login` em modal com `next`. A tab ativa continua a mesma.
 */
export default function TabsLayout() {
  const { c } = useTheme();
  const { user } = useCurrentUser();
  const router = useRouter();
  const [collectionCount, setCollectionCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setCollectionCount(0);
      return;
    }
    void getCollection(user.id)
      .then((items: CollectionItemWithCar[]) =>
        items.reduce((sum, item) => sum + item.quantity, 0)
      )
      .then(setCollectionCount)
      .catch(() => setCollectionCount(0));
  }, [user]);

  return (
    <Tabs
      screenListeners={{
        tabPress: (event) => {
          // `event.target` traz o id da rota (`index-0`, `perfil-0` etc.).
          const target = event.target ?? "";
          const name = target.split("-")[0];
          if ((name === "perfil" || name === "colecao") && !user) {
            event.preventDefault();
            const next = name === "perfil" ? "/perfil" : "/colecao";
            router.push({ pathname: "/login", params: { next } });
          }
        },
      }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c("primary-text"),
        tabBarInactiveTintColor: c("fg-subtle"),
        tabBarStyle: { backgroundColor: c("ink"), borderTopColor: c("border") },
        tabBarBadgeStyle: { backgroundColor: c("primary"), color: c("primary-fg") },
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
          tabBarBadge: collectionCount > 0 ? collectionCount : undefined,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: user ? "Perfil" : "Entrar",
          tabBarIcon: ({ color, size }) =>
            user ? (
              <User color={color} size={size} strokeWidth={1.75} />
            ) : (
              <LogIn color={color} size={size} strokeWidth={1.75} />
            ),
        }}
      />
    </Tabs>
  );
}
