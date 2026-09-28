import { Keyboard, View } from "react-native";
import { useRouter } from "expo-router";
import { Bell, type LucideIcon } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme, ThemeScope } from "@/theme/ThemeProvider";
import { elevation } from "@/theme/elevation";
import { IconButton } from "@/components/ui/IconButton";
import { CountBadge } from "@/components/ui/Badge";
import { Logo } from "@/components/ui/Logo";
import { Text } from "@/components/ui/Text";
import { useUnreadNotificationsCount } from "@/hooks/useNotifications";

/**
 * Header das telas raiz da barra inferior
 * (`docs/briefings/navegacao-mais.md`): sino com o contador de não
 * lidas à esquerda (abre a caixa de notificações), título h3 (ou a
 * Logo sm na Home) e até 1 ação à direita; sem ação, um espaçador de
 * 44 pt mantém o título no lugar. 52 pt + `insets.top`, fixo (não
 * colapsa).
 *
 * `ink`: faixa ink da Home (`ThemeScope dark`). Nas demais telas,
 * `bg-surface` com borda no dark e `elevation("e2")` no light.
 */
export type RootHeaderAction = {
  icon: LucideIcon;
  accessibilityLabel: string;
  onPress: () => void;
  /** Contador (ex.: notificações não lidas); omitido ou 0 = sem badge. */
  badge?: number;
};

type Props = {
  title?: string;
  /** Mostra a Logo no lugar do título (Home). */
  logo?: boolean;
  ink?: boolean;
  /** Uma ação, ou várias lado a lado (ex.: Buscar + sino de notificações). */
  action?: RootHeaderAction | RootHeaderAction[];
};

export function RootHeader({ title, logo = false, ink = false, action }: Props) {
  const insets = useSafeAreaInsets();
  const { scheme } = useTheme();
  const router = useRouter();
  const unreadCount = useUnreadNotificationsCount();

  const openNotifications = () => {
    Keyboard.dismiss();
    router.push("/mais/notificacoes");
  };

  const actions = action ? (Array.isArray(action) ? action : [action]) : [];

  const bar = (
    <View
      className="flex-row items-center"
      style={{ height: 52 + insets.top, paddingTop: insets.top, paddingHorizontal: 4 }}
    >
      <View>
        <IconButton
          icon={Bell}
          size="lg"
          accessibilityLabel={unreadCount > 0 ? `Notificações, ${unreadCount} novas` : "Notificações"}
          onPress={openNotifications}
        />
        {unreadCount ? (
          <View pointerEvents="none" style={{ position: "absolute", top: 4, right: 4 }}>
            <CountBadge count={unreadCount} />
          </View>
        ) : null}
      </View>
      <View className="flex-1 px-2 items-start justify-center">
        {logo ? (
          <Logo variant={ink || scheme === "dark" ? "dark" : "light"} size="sm" />
        ) : title ? (
          <Text variant="h3" className="font-display" numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
        ) : null}
      </View>
      {actions.length > 0 ? (
        <View className="flex-row items-center">
          {actions.map((a, i) => (
            <ActionButton key={i} {...a} />
          ))}
        </View>
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

function ActionButton({ icon, accessibilityLabel, onPress, badge }: RootHeaderAction) {
  return (
    <View>
      <IconButton
        icon={icon}
        size="lg"
        accessibilityLabel={badge ? `${accessibilityLabel}, ${badge} novas` : accessibilityLabel}
        onPress={onPress}
      />
      {badge ? (
        <View pointerEvents="none" style={{ position: "absolute", top: 4, right: 4 }}>
          <CountBadge count={badge} />
        </View>
      ) : null}
    </View>
  );
}
