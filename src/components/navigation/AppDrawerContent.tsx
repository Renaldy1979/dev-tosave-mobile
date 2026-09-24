import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { ChevronRight, LogOut } from "lucide-react-native";
import Constants from "expo-constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { DrawerContentComponentProps } from "expo-router/drawer";
import { useTheme, ThemeScope } from "@/theme/ThemeProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { DRAWER_ITEMS, type DrawerItem } from "@/navigation/drawerItems";
import { Avatar, deriveAvatarInitials } from "@/components/ui/Avatar";
import { CountBadge } from "@/components/ui/Badge";
import { ListRow } from "@/components/ui/ListRow";
import { Text } from "@/components/ui/Text";
import { SignOutDialog } from "./SignOutDialog";

/**
 * Conteúdo do menu lateral (`docs/design/telas/09-menu-drawer.md` §2).
 *
 * Cabeçalho do usuário (→ Perfil), itens de `DRAWER_ITEMS` com o ativo
 * destacado e rodapé fixo com "Sair" + versão. Segue o tema atual
 * (`ThemeScope` com o esquema resolvido, nunca fixo em dark).
 */
export function AppDrawerContent({ state, navigation }: DrawerContentComponentProps) {
  const { scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useCurrentUser();
  const [signOutOpen, setSignOutOpen] = useState(false);

  const activeName = state.routes[state.index]?.name;

  const go = (name: string) => {
    navigation.closeDrawer();
    if (name !== activeName) navigation.navigate(name);
  };

  const name = user?.name?.trim() || "";
  const email = user?.email ?? "";
  const version = Constants.expoConfig?.version ?? "";

  return (
    <ThemeScope scheme={scheme} className="flex-1 bg-surface">
      <View className="flex-1" style={{ paddingTop: insets.top + 16 }}>
        {/* cabeçalho do usuário */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${name || email}${name && email ? `, ${email}` : ""}. Abrir perfil`}
          onPress={() => go("perfil")}
          className="flex-row items-center gap-3 px-4 py-3 border-b border-border active:bg-surface-3"
          style={{ minHeight: 72 }}
        >
          <Avatar initials={deriveAvatarInitials(name || null)} size={56} />
          <View className="flex-1 min-w-0">
            <Text variant="h3" numberOfLines={1}>
              {name || email}
            </Text>
            {name && email ? (
              <Text variant="body-sm" tone="muted" numberOfLines={1}>
                {email}
              </Text>
            ) : null}
          </View>
          <ChevronRightIcon />
        </Pressable>

        {/* itens */}
        <ScrollView contentContainerStyle={{ paddingVertical: 12, gap: 4 }}>
          {DRAWER_ITEMS.map((item) => (
            <DrawerRow
              key={item.name}
              item={item}
              active={item.name === activeName}
              onPress={() => go(item.name)}
            />
          ))}
        </ScrollView>

        {/* rodapé */}
        <View className="border-t border-border" style={{ paddingBottom: insets.bottom + 12 }}>
          <ListRow
            icon={LogOut}
            label="Sair"
            variant="danger"
            showChevron={false}
            accessibilityHint="Encerra a sessão neste aparelho"
            onPress={() => {
              navigation.closeDrawer();
              setSignOutOpen(true);
            }}
          />
          {version ? (
            <Text variant="caption" tone="subtle" className="px-4 pt-2">
              Versão {version}
            </Text>
          ) : null}
        </View>
      </View>
      <SignOutDialog open={signOutOpen} onClose={() => setSignOutOpen(false)} />
    </ThemeScope>
  );
}

function ChevronRightIcon() {
  const { c } = useTheme();
  return <ChevronRight size={18} color={c("fg-subtle")} strokeWidth={1.75} />;
}

function DrawerRow({
  item,
  active,
  onPress,
}: {
  item: DrawerItem;
  active: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  const Icon = item.icon;
  const count = item.badge?.() ?? 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `${item.label}, ${count} novas` : item.label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={`flex-row items-center gap-3 mx-3 px-3 rounded-md ${
        active ? "bg-primary-soft" : "active:bg-surface-3"
      }`}
      style={{ minHeight: 48 }}
    >
      {active ? (
        <View
          className="absolute left-0 rounded-full bg-primary"
          style={{ width: 3, height: 20 }}
        />
      ) : null}
      <Icon size={22} color={active ? c("primary-text") : c("fg-muted")} strokeWidth={1.75} />
      <Text
        variant="body"
        tone={active ? "primary" : "fg"}
        className={`flex-1 ${active ? "font-sans-semibold" : "font-sans-medium"}`}
        numberOfLines={1}
      >
        {item.label}
      </Text>
      {count > 0 ? <CountBadge count={count} /> : null}
    </Pressable>
  );
}
