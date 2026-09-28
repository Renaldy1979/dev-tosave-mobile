import { useCallback, useState } from "react";
import { Linking, Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight, FileText, Info, LogOut, Mail, ShieldCheck } from "lucide-react-native";
import Constants from "expo-constants";
import { useTheme } from "@/theme/ThemeProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUnreadNotificationsCount } from "@/hooks/useNotifications";
import { useAppConfig } from "@/hooks/useAppConfig";
import { NAV_ITEMS } from "@/navigation/navItems";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Header } from "@/components/ui/Header";
import { Avatar, deriveAvatarInitials } from "@/components/ui/Avatar";
import { CountBadge } from "@/components/ui/Badge";
import { ListRow } from "@/components/ui/ListRow";
import { Text } from "@/components/ui/Text";
import { useToast } from "@/components/ui/Toast";
import { openExternal } from "@/utils/openExternal";
import { SignOutDialog } from "@/components/navigation/SignOutDialog";

/**
 * Tela Mais (`docs/briefings/navegacao-mais.md`): cartão do usuário,
 * a árvore de navegação completa (itens 1 a 9, na ordem oficial de
 * `navItems.ts`) e a seção "Ajuda e informações" (`GET /v2/config`).
 *
 * Item que está na barra troca de aba (`router.navigate`); item que
 * não está empilha na pilha própria desta aba (`router.push`).
 */
export default function Mais() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const { show } = useToast();
  const appConfig = useAppConfig();
  const [signOutOpen, setSignOutOpen] = useState(false);
  // Só para re-renderizar quando a contagem mudar — os itens leem o
  // valor atual direto de `item.badge()` (`getUnreadNotificationsSnapshot`).
  useUnreadNotificationsCount();

  const name = user?.name?.trim() || "";
  const email = user?.email ?? "";
  const version = Constants.expoConfig?.version ?? "";

  const openLegal = useCallback(
    async (url: string) => {
      if (!(await openExternal(url))) show({ type: "danger", message: "Não foi possível abrir o link." });
    },
    [show]
  );

  const goItem = (item: (typeof NAV_ITEMS)[number]) => {
    if (item.tabRoute) router.navigate(item.tabRoute);
    else if (item.moreRoute) router.push(item.moreRoute);
  };

  return (
    <ScreenContainer bg="bg" edges={["bottom"]} className="bg-bg">
      <Header variant="root" title="Mais" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Cartão do usuário */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${name || email}${name && email ? `, ${email}` : ""}. Abrir perfil`}
          onPress={() => router.push("/mais/perfil")}
          className="flex-row items-center gap-3 px-4 py-3 mt-2 active:bg-surface-3"
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

        {/* Navegação: itens 1 a 9, todos, incluindo os que estão na barra */}
        <Text variant="eyebrow" tone="subtle" className="px-4 mt-6 mb-2">
          NAVEGAÇÃO
        </Text>
        <View className="rounded-lg bg-surface border border-border overflow-hidden mx-4">
          {NAV_ITEMS.map((item, i) => (
            <NavRow key={item.key} item={item} first={i === 0} onPress={() => goItem(item)} />
          ))}
        </View>

        {/* Ajuda e informações: valores de `GET /v2/config`, item vazio some */}
        <Text variant="eyebrow" tone="subtle" className="px-4 mt-6 mb-2">
          AJUDA E INFORMAÇÕES
        </Text>
        <View className="rounded-lg bg-surface border border-border overflow-hidden mx-4">
          {appConfig.supportEmail ? (
            <ListRow
              icon={Mail}
              label="Falar com o suporte"
              onPress={() => Linking.openURL(`mailto:${appConfig.supportEmail}`).catch(() => undefined)}
            />
          ) : null}
          {appConfig.privacyUrl ? (
            <ListRow
              icon={ShieldCheck}
              label="Política de privacidade"
              onPress={() => openLegal(appConfig.privacyUrl)}
            />
          ) : null}
          {appConfig.termsUrl ? (
            <ListRow icon={FileText} label="Termos de uso" onPress={() => openLegal(appConfig.termsUrl)} />
          ) : null}
          <ListRow icon={Info} label="Sobre o ToSave" value={version ? `Versão ${version}` : undefined} />
        </View>

        {/* Sair */}
        <View className="rounded-lg bg-surface border border-border overflow-hidden mx-4 mt-6">
          <ListRow
            icon={LogOut}
            label="Sair"
            variant="danger"
            showChevron={false}
            accessibilityHint="Encerra a sessão neste aparelho"
            onPress={() => setSignOutOpen(true)}
          />
        </View>
      </ScrollView>
      <SignOutDialog open={signOutOpen} onClose={() => setSignOutOpen(false)} />
    </ScreenContainer>
  );
}

function ChevronRightIcon() {
  const { c } = useTheme();
  return <ChevronRight size={18} color={c("fg-subtle")} strokeWidth={1.75} />;
}

function NavRow({
  item,
  first,
  onPress,
}: {
  item: (typeof NAV_ITEMS)[number];
  first: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  const Icon = item.icon;
  const count = item.badge?.() ?? 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `${item.label}, ${count} novas` : item.label}
      onPress={onPress}
      className={`flex-row items-center gap-3 px-4 min-h-14 active:bg-surface-3 ${
        first ? "" : "border-t border-border"
      }`}
    >
      <Icon size={20} color={c("fg-muted")} strokeWidth={1.75} />
      <Text variant="body" className="flex-1" numberOfLines={1}>
        {item.label}
      </Text>
      {count > 0 ? <CountBadge count={count} /> : null}
      <ChevronRight color={c("fg-subtle")} size={18} strokeWidth={1.75} />
    </Pressable>
  );
}
