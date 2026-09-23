import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  View,
} from "react-native";
import {
  useRouter,
} from "expo-router";
import { LogOut, Moon, Smartphone, Sun } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import Constants from "expo-constants";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useDelayedFlag } from "@/hooks/useDelayedFlag";
import {
  getCollectionSummary,
  updateProfile,
} from "@/services";
import type { CollectionSummary } from "@/types";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Header } from "@/components/ui/Header";
import { Text } from "@/components/ui/Text";
import { Avatar, deriveAvatarInitials } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatTile, StatTileSkeleton } from "@/components/ui/StatTile";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { ListRow } from "@/components/ui/ListRow";
import { Logo } from "@/components/ui/Logo";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Dialog } from "@/components/ui/Dialog";
import { ErrorState } from "@/components/ui/ErrorState";
import { ProfileSkeleton } from "@/components/car/CarCardSkeleton";
import { LoginGate } from "@/components/ui/LoginGate";
import { useToast } from "@/components/ui/Toast";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Tela de Perfil (`docs/design/telas/07-perfil.md`).
 *
 * Avatar + nome + e-mail + Editar; resumo da coleção (StatTile ×3);
 * Aparência (Escuro/Claro/Sistema); Conta (Minha coleção, E-mail, Sair);
 * logo + versão no rodapé.
 *
 * Requer sessão: sem usuário, renderiza `LoginGate`. Editar perfil abre
 * BottomSheet `dynamic` com inputs validados; Sair abre Dialog de
 * confirmação.
 */
export default function Perfil() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { scheme, preference, setPreference } = useTheme();
  const { user, signOut, refresh } = useCurrentUser();
  const { show } = useToast();

  const [summary, setSummary] = useState<CollectionSummary | null>(null);
  const [summaryState, setSummaryState] = useState<"loading" | "ok" | "error">("loading");
  const [userState, setUserState] = useState<"loading" | "ok" | "error">("ok");
  const showSummarySkeleton = useDelayedFlag(summaryState === "loading", 150);

  const [editOpen, setEditOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [signOutLoading, setSignOutLoading] = useState(false);

  const loadSummary = useCallback(async () => {
    if (!user) {
      setSummary(null);
      return;
    }
    setSummaryState("loading");
    try {
      const s = await getCollectionSummary(user.id);
      setSummary(s);
      setSummaryState("ok");
    } catch {
      setSummaryState("error");
    }
  }, [user]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const handleSignOut = useCallback(async () => {
    setSignOutLoading(true);
    try {
      await signOut();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      setSignOutOpen(false);
      router.replace("/");
    } catch {
      show({ type: "danger", message: "Não foi possível sair agora." });
    } finally {
      setSignOutLoading(false);
    }
  }, [signOut, router, show]);

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  if (!user) {
    return (
      <ScreenContainer bg="bg" edges={["bottom"]} className="bg-bg">
        <Header variant="large" title="Perfil" scrollY={scrollY} />
        <LoginGate
          title="Entre para acessar sua conta"
          description="Suas miniaturas e preferências ficam salvas na sua conta."
          next="/perfil"
        />
      </ScreenContainer>
    );
  }

  if (userState === "error") {
    return (
      <ScreenContainer bg="bg" edges={["bottom"]} className="bg-bg">
        <Header variant="large" title="Perfil" scrollY={scrollY} />
        <View className="flex-1 items-center justify-center px-8">
          <ErrorState
            title="Não foi possível carregar."
            description="Tente novamente em alguns instantes."
            onRetry={async () => {
              setUserState("loading");
              try {
                await refresh();
                setUserState("ok");
              } catch {
                setUserState("error");
              }
            }}
          />
        </View>
      </ScreenContainer>
    );
  }

  const versionLabel = (() => {
    const v = (Constants as unknown as { expoConfig?: { version?: string } })?.expoConfig?.version;
    return v ? `Versão ${v}` : "Versão 1.0.0";
  })();
  const bottomPadding = 56 + insets.bottom + 24;

  const initials = deriveAvatarInitials(user.name);

  return (
    <ScreenContainer bg="bg" edges={["bottom"]} className="bg-bg">
      <Header variant="large" title="Perfil" scrollY={scrollY} />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        refreshControl={
          <RefreshControl
            tintColor={scheme === "dark" ? "#FF9A1A" : "#B85600"}
            refreshing={false}
            onRefresh={async () => {
              await Promise.all([refresh(), loadSummary()]);
            }}
          />
        }
      >
        {/* Identidade */}
        <View className="items-center mt-6 px-4">
          <Avatar initials={initials} size={88} ring="flame" />
          <Text variant="h2" className="mt-3 font-display" numberOfLines={1}>
            {user.name || user.email}
          </Text>
          <Text variant="body-sm" tone="muted" className="mt-0.5" numberOfLines={1}>
            {user.email}
          </Text>
          <Button
            label="Editar perfil"
            variant="outline"
            size="sm"
            onPress={() => setEditOpen(true)}
            className="mt-3"
          />
        </View>

        {/* Resumo da coleção */}
        <View className="px-4 mt-6">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ir para coleção"
            onPress={() => router.push("/colecao")}
            className="active:opacity-90"
          >
            <View className="rounded-lg bg-surface border border-border p-3 flex-row">
              {showSummarySkeleton && summaryState === "loading" ? (
                <>
                  <StatTileSkeleton />
                  <StatTileSkeleton />
                  <StatTileSkeleton />
                </>
              ) : summaryState === "error" ? (
                <ErrorState size="sm" title="Resumo indisponível." onRetry={loadSummary} className="flex-1" />
              ) : summary ? (
                <>
                  <StatTile
                    value={summary.totalItems}
                    label="Itens"
                    accessibilityLabel={`${summary.totalItems} itens na coleção`}
                  />
                  <StatTile
                    value={summary.totalModels}
                    label="Modelos"
                    accessibilityLabel={`${summary.totalModels} modelos na coleção`}
                  />
                  <StatTile
                    value={summary.duplicates}
                    label="Repetid."
                    onPress={() => router.push("/colecao?dup=1")}
                    accessibilityLabel={`${summary.duplicates} modelos repetidos, toque para filtrar`}
                  />
                </>
              ) : (
                <>
                  <StatTile value={0} label="Itens" />
                  <StatTile value={0} label="Modelos" />
                  <StatTile value={0} label="Repetid." />
                </>
              )}
            </View>
          </Pressable>
          {summary && summary.totalItems === 0 ? (
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Explorar miniaturas"
              onPress={() => router.push("/busca")}
              hitSlop={8}
              className="self-start mt-2 active:opacity-70"
            >
              <Text variant="body" tone="primary" className="font-sans-medium">
                Explorar miniaturas
              </Text>
            </Pressable>
          ) : null}
        </View>

        {/* Aparência */}
        <View className="px-4 mt-8">
          <Text variant="eyebrow" tone="subtle" className="mb-2">
            APARÊNCIA
          </Text>
          <SegmentedControl
            value={preference}
            onChange={(v) => setPreference(v)}
            accessibilityLabel="Tema do app"
            options={[
              { value: "dark", label: "Escuro", icon: Moon },
              { value: "light", label: "Claro", icon: Sun },
              { value: "system", label: "Sistema", icon: Smartphone },
            ]}
          />
        </View>

        {/* Conta */}
        <View className="px-4 mt-8">
          <Text variant="eyebrow" tone="subtle" className="mb-2">
            CONTA
          </Text>
          <View className="rounded-lg bg-surface border border-border overflow-hidden">
            <ListRow icon={Heart} label="Minha coleção" onPress={() => router.push("/colecao")} />
            <ListRow icon={Mail} label="E-mail" value={user.email} />
          </View>
          <View className="rounded-lg bg-surface border border-border overflow-hidden mt-3">
            <ListRow
              icon={LogOut}
              label="Sair"
              variant="danger"
              onPress={() => setSignOutOpen(true)}
              showChevron={false}
              accessibilityHint="Encerra a sessão neste aparelho"
            />
          </View>
        </View>

        {/* Logo + Versão */}
        <View className="items-center mt-10">
          <Logo variant="auto" size="md" className="opacity-60" />
          <Text variant="caption" tone="subtle" className="mt-2">
            {versionLabel}
          </Text>
        </View>
      </Animated.ScrollView>

      {/* BottomSheet de edição de perfil */}
      <EditProfileSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        currentName={user.name}
        currentEmail={user.email}
        onSaved={async () => {
          await refresh();
          show({ type: "success", message: "Perfil atualizado." });
        }}
      />

      {/* Dialog de Sair */}
      <Dialog
        open={signOutOpen}
        onClose={() => setSignOutOpen(false)}
        title="Sair da sua conta?"
        description="Você continua podendo explorar as miniaturas, mas precisará entrar de novo para ver sua coleção."
        actions={[
          { label: "Sair", variant: "danger", loading: signOutLoading, onPress: handleSignOut },
          { label: "Cancelar", variant: "ghost", onPress: () => setSignOutOpen(false) },
        ]}
      />
    </ScreenContainer>
  );
}

/* ================================================================== */
/*                          EDIÇÃO DE PERFIL                           */
/* ================================================================== */

function EditProfileSheet({
  open,
  onClose,
  currentName,
  currentEmail,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  currentName: string;
  currentEmail: string;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(currentName);
  const [email, setEmail] = useState(currentEmail);
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { show } = useToast();

  // Reseta para o valor atual toda vez que o sheet abre
  useEffect(() => {
    if (open) {
      setName(currentName);
      setEmail(currentEmail);
      setNameError(null);
      setEmailError(null);
      setBanner(null);
    }
  }, [open, currentName, currentEmail]);

  const dirty = name.trim() !== currentName.trim() || email.trim().toLowerCase() !== currentEmail.toLowerCase();

  const validate = useCallback(() => {
    let ok = true;
    if (name.trim().length < 2) {
      setNameError("Informe seu nome.");
      ok = false;
    } else if (name.trim().length > 60) {
      setNameError("Nome muito longo.");
      ok = false;
    } else {
      setNameError(null);
    }
    if (!EMAIL_RE.test(email.trim())) {
      setEmailError("E-mail inválido.");
      ok = false;
    } else {
      setEmailError(null);
    }
    return ok;
  }, [name, email]);

  const handleSave = useCallback(async () => {
    setBanner(null);
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      return;
    }
    setSaving(true);
    try {
      const result = await updateProfile({ name: name.trim(), email: email.trim() });
      if (!result.ok) {
        setBanner("Não foi possível salvar agora. Tente novamente.");
        return;
      }
      await onSaved();
      onClose();
    } catch {
      setBanner("Não foi possível salvar agora. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }, [validate, name, email, onSaved, onClose]);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Editar perfil"
      snapPoints="dynamic"
      footer={
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button label="Cancelar" variant="ghost" size="md" fullWidth onPress={onClose} disabled={saving} />
          </View>
          <View className="flex-[2]">
            <Button
              label="Salvar"
              variant="primary"
              size="md"
              fullWidth
              loading={saving}
              disabled={!dirty || saving}
              onPress={() => {
                void handleSave();
              }}
            />
          </View>
        </View>
      }
    >
      <View className="px-5 gap-4 pb-2">
        <Input
          label="Nome"
          value={name}
          onChangeText={(t) => {
            setName(t);
            if (nameError) setNameError(null);
          }}
          error={nameError ?? undefined}
          autoComplete="name"
          autoCapitalize="words"
          placeholder="Seu nome"
        />
        <Input
          label="E-mail"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            if (emailError) setEmailError(null);
          }}
          error={emailError ?? undefined}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
          placeholder="voce@email.com"
        />
        {banner ? (
          <View className="rounded-md px-3 py-2.5 bg-flame-soft border" style={{ borderColor: "rgba(255,56,56,0.4)" }}>
            <Text variant="body-sm" tone="flame">
              {banner}
            </Text>
          </View>
        ) : null}
      </View>
    </BottomSheet>
  );
}

/* Ícones auxiliares (placeholders para evitar import de lucide direto) */
import { Heart, Mail } from "lucide-react-native";
function HeartIcon(props: { color: string; size: number; strokeWidth?: number }) {
  return <Heart {...props} strokeWidth={1.75} />;
}
function MailIcon(props: { color: string; size: number; strokeWidth?: number }) {
  return <Mail {...props} strokeWidth={1.75} />;
}

// re-export do useToast para garantir que a referência não suma em tree-shaking.
void useToast;
