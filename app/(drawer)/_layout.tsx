import { StyleSheet, useWindowDimensions } from "react-native";
import { Drawer } from "expo-router/drawer";
import { useTheme } from "@/theme/ThemeProvider";
import { elevation } from "@/theme/elevation";
import { AppDrawerContent } from "@/components/navigation/AppDrawerContent";
import { DRAWER_ITEMS } from "@/navigation/drawerItems";

/**
 * Menu lateral (`docs/design/telas/09-menu-drawer.md`) no lugar das
 * abas. As 4 telas raiz vivem aqui; o Detalhe (`car/[id]`) fica no
 * Stack raiz, fora do drawer. Cada tela desenha o próprio header
 * (`Header variant="root"`), por isso `headerShown: false`.
 *
 * A guarda de sessão é a única do app: o `AuthGate` do `_layout` raiz.
 */
export default function DrawerLayout() {
  const { c, scheme } = useTheme();
  const { width } = useWindowDimensions();

  return (
    <Drawer
      drawerContent={(props) => <AppDrawerContent {...props} />}
      backBehavior="initialRoute"
      screenOptions={{
        headerShown: false,
        drawerType: "front",
        drawerPosition: "left",
        swipeEdgeWidth: 24,
        keyboardDismissMode: "on-drag",
        overlayColor: "rgba(11,11,13,0.7)",
        drawerStyle: [
          {
            width: Math.min(width * 0.8, 320),
            backgroundColor: c("surface"),
          },
          scheme === "dark"
            ? { borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: c("border") }
            : elevation("e3", scheme),
        ],
      }}
    >
      {DRAWER_ITEMS.map((item) => (
        <Drawer.Screen key={item.name} name={item.name} options={{ title: item.label }} />
      ))}
    </Drawer>
  );
}
