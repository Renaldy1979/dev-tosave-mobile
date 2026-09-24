import { Keyboard, View } from "react-native";
import { useNavigation } from "expo-router";
import { useDrawerStatus } from "expo-router/drawer";
import { Menu, type LucideIcon } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, ThemeScope } from "@/theme/ThemeProvider";
import { elevation } from "@/theme/elevation";
import { IconButton } from "@/components/ui/IconButton";
import { Logo } from "@/components/ui/Logo";
import { Text } from "@/components/ui/Text";

/**
 * Header das telas raiz do drawer (`09-menu-drawer.md` §1):
 * `≡` à esquerda (abre o menu), título h3 (ou a Logo sm na Home) e até
 * 1 ação à direita; sem ação, um espaçador de 44 pt mantém o título no
 * lugar. 52 pt + `insets.top`, fixo (não colapsa).
 *
 * `ink`: faixa ink da Home (`ThemeScope dark`). Nas demais telas,
 * `bg-surface` com borda no dark e `elevation("e2")` no light.
 *
 * Só pode ser usado dentro do `(drawer)` (lê o estado do drawer).
 */
export type RootHeaderAction = {
  icon: LucideIcon;
  accessibilityLabel: string;
  onPress: () => void;
};

type Props = {
  title?: string;
  /** Mostra a Logo no lugar do título (Home). */
  logo?: boolean;
  ink?: boolean;
  action?: RootHeaderAction;
};

type DrawerNavigation = { openDrawer: () => void };

export function RootHeader({ title, logo = false, ink = false, action }: Props) {
  const insets = useSafeAreaInsets();
  const { scheme } = useTheme();
  const navigation = useNavigation() as unknown as DrawerNavigation;
  const drawerOpen = useDrawerStatus() === "open";

  const openMenu = () => {
    Keyboard.dismiss();
    navigation.openDrawer();
  };

  const bar = (
    <View
      className="flex-row items-center"
      style={{ height: 52 + insets.top, paddingTop: insets.top, paddingHorizontal: 4 }}
    >
      <IconButton
        icon={Menu}
        size="lg"
        accessibilityLabel="Abrir menu"
        accessibilityHint="Mostra as seções do app"
        accessibilityState={{ expanded: drawerOpen }}
        onPress={openMenu}
      />
      <View className="flex-1 px-2 items-start justify-center">
        {logo ? (
          <Logo variant={ink || scheme === "dark" ? "dark" : "light"} size="sm" />
        ) : title ? (
          <Text variant="h3" className="font-display" numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
        ) : null}
      </View>
      {action ? (
        <IconButton
          icon={action.icon}
          size="lg"
          accessibilityLabel={action.accessibilityLabel}
          onPress={action.onPress}
        />
      ) : (
        <View style={{ width: 44 }} />
      )}
    </View>
  );

  if (ink) {
    return (
      <ThemeScope scheme="dark" className="bg-ink">
        {bar}
      </ThemeScope>
    );
  }
  return (
    <View
      className={scheme === "dark" ? "bg-surface border-b border-border" : "bg-surface"}
      style={[elevation("e2", scheme), { zIndex: 1 }]}
    >
      {bar}
    </View>
  );
}
