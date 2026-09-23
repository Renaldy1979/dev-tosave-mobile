import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AlertCircle, Lock, Mail, X } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCollectionStore } from "@/hooks/useCollectionStore";
import { addToCollection, getCollectionQuantity } from "@/services/collection";
import { getDemoCredentials } from "@/services/auth";
import { LogoCar } from "@/components/ui/Logo";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Logo } from "@/components/ui/Logo";
import { IconButton } from "@/components/ui/IconButton";
import { useToast } from "@/components/ui/Toast";

type LoginVariant = "add" | "colecao" | "perfil" | "default";

const COPY: Record<LoginVariant, { title: string; body: string }> = {
  add: {
    title: "Entre para salvar sua coleção",
    body: "Guarde suas miniaturas e controle as repetidas.",
  },
  colecao: {
    title: "Entre para ver sua coleção",
    body: "Suas miniaturas ficam salvas na sua conta.",
  },
  perfil: {
    title: "Bem-vindo de volta",
    body: "Entre para acessar sua conta.",
  },
  default: {
    title: "Bem-vindo de volta",
    body: "Entre para acessar sua conta.",
  },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Login modal simulado (`docs/design/telas/02-login.md`).
 *
 * Params (expo-router):
 * - `intent=add&carId=123` → depois de entrar, chama `addToCollection`.
 * - `next=/colecao` ou `next=/perfil` → navega para a rota ao concluir.
 *
 * Sem params = "default" (Bem-vindo de volta).
 *
 * Com sessão ativa, fecha sozinho antes de renderizar (§6 "Aberto já
 * com sessão").
 */
export default function Login() {
  const router = useRouter();
  const params = useLocalSearchParams<{ intent?: string; carId?: string; next?: string }>();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { user, signIn, refresh } = useCurrentUser();
  const collectionStore = useCollectionStore();
  const { show } = useToast();

  const variant: LoginVariant = useMemo(() => {
    if (params.intent === "add" && params.carId) return "add";
    if (params.next === "/colecao") return "colecao";
    if (params.next === "/perfil") return "perfil";
    return "default";
  }, [params.intent, params.carId, params.next]);

  // Se já há sessão ao montar (deep link), fecha.
  useEffect(() => {
    if (user) {
      router.back();
    }
  }, [user, router]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const validate = useCallback(
    (touched: { email: boolean; password: boolean }) => {
      let emailErr: string | null = null;
      let passwordErr: string | null = null;
      if (touched.email && email.trim() === "") emailErr = "Informe seu e-mail.";
      else if (touched.email && !EMAIL_RE.test(email.trim())) emailErr = "E-mail inválido.";
      if (touched.password && password.length === 0) passwordErr = "Informe sua senha.";
      setEmailError(emailErr);
      setPasswordError(passwordErr);
      return !emailErr && !passwordErr;
    },
    [email, password]
  );

  const handleSubmit = useCallback(async () => {
    setBanner(null);
    const ok = validate({ email: true, password: true });
    if (!ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      return;
    }
    setSubmitting(true);

    // Bloqueia back enquanto envia.
    const backSub = BackHandler.addEventListener("hardwareBackPress", () => true);

    let result: Awaited<ReturnType<typeof signIn>> | null = null;
    try {
      result = await signIn(email.trim(), password);
    } catch {
      setBanner("Não foi possível entrar agora. Tente novamente.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      setSubmitting(false);
      backSub.remove();
      return;
    }

    if (!result.ok) {
      setBanner("E-mail ou senha incorretos.");
      setPassword("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      setSubmitting(false);
      backSub.remove();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);

    // Conclui a ação pendente antes de fechar.
    if (variant === "add" && params.carId) {
      try {
        // Só soma unidade se ainda não estiver na coleção.
        const existing = await getCollectionQuantity(result.user.id, params.carId);
        if (existing === 0) {
          await addToCollection(result.user.id, params.carId);
          // Sincroniza o store compartilhado da coleção.
          await collectionStore.refresh();
          show({ type: "success", message: "Adicionada à sua coleção." });
        }
      } catch {
        show({ type: "danger", message: "Não foi possível atualizar sua coleção." });
      }
    }

    // Reavalia o estado para garantir.
    await refresh();

    show({ type: "success", message: "Bem-vindo de volta." });

    // Fecha modal e, em seguida, navega para `next` se houver.
    backSub.remove();
    setSubmitting(false);
    router.back();
    if (params.next && params.next.startsWith("/") && params.next !== "/login") {
      // Pequeno delay para o back terminar antes do navigate.
      setTimeout(() => {
        router.navigate(params.next as "/colecao" | "/perfil");
      }, 50);
    }
  }, [
    validate,
    signIn,
    email,
    password,
    variant,
    params.carId,
    params.next,
    refresh,
    router,
    collectionStore,
    show,
  ]);

  const handleFillDemo = useCallback(async () => {
    const demo = await getDemoCredentials();
    setEmail(demo.email);
    setPassword(demo.password);
    setEmailError(null);
    setPasswordError(null);
    setBanner(null);
  }, []);

  const copy = COPY[variant];

  return (
    <ScreenContainer bg="ink" edges={["bottom"]} className="flex-1">
      {/* topo ink: palco da logo + marca d'água (sem props que possam
          causar layout 0-px em Modal pageSheet do iOS: scale, radius
          9999, margins negativas). */}
      <View
        className="relative items-center justify-center overflow-hidden bg-ink"
        style={{ height: 220 }}
      >
        {/* gradiente radial primary/12 */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: -120,
            left: -120,
            right: -120,
            bottom: -120,
            backgroundColor: "rgba(253, 132, 1, 0.12)",
            borderRadius: 220,
          }}
        />
        {/* marca d'água com largura limitada */}
        <View
          className="absolute items-center justify-center"
          style={{ width: "100%", height: 220, opacity: 0.06 }}
        >
          <LogoCar width={260} />
        </View>
        <View style={{ maxWidth: 440, width: "100%" }} className="items-center">
          <Logo variant="dark" size="md" />
        </View>
        {/* Fechar (canto superior esquerdo) — no pageSheet do iOS, não leva inset superior */}
        <View
          className="absolute left-3"
          style={{ top: Platform.OS === "ios" ? 8 : insets.top + 8 }}
        >
          <IconButton
            icon={X}
            variant="glass"
            size="md"
            accessibilityLabel="Fechar"
            onPress={() => router.back()}
            disabled={submitting}
          />
        </View>
      </View>

      {/* conteúdo do formulário */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: 24,
            maxWidth: 440,
            width: "100%",
            alignSelf: "center",
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text
            variant="display-lg"
            tone="ink"
            className="text-ink-fg"
            accessibilityRole="header"
          >
            {copy.title}
          </Text>
          <Text variant="body" tone="ink" className="text-ink-fg/70 mt-2">
            {copy.body}
          </Text>

          <View className="mt-6 gap-4">
            <Input
              label="E-mail"
              placeholder="voce@email.com"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (emailError) validate({ email: true, password: false });
              }}
              onBlur={() => validate({ email: true, password: false })}
              error={emailError ?? undefined}
              leftIcon={Mail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="username"
              returnKeyType="next"
              editable={!submitting}
              autoFocus
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <Input
              label="Senha"
              placeholder="••••••••"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (passwordError) validate({ email: false, password: true });
              }}
              onBlur={() => validate({ email: false, password: true })}
              error={passwordError ?? undefined}
              leftIcon={Lock}
              variant="password"
              autoComplete="password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
              editable={!submitting}
              ref={passwordRef}
            />
          </View>

          {/* banner de erro */}
          {banner ? (
            <View
              accessibilityLiveRegion="polite"
              className="mt-4 rounded-md flex-row items-center gap-2 px-3 py-2.5 bg-flame-soft border"
              style={{ borderColor: "rgba(255,56,56,0.4)" }}
            >
              <AlertCircle size={18} color={c("flame")} strokeWidth={1.75} />
              <Text variant="body-sm" tone="flame">
                {banner}
              </Text>
            </View>
          ) : null}

          {/* CTA Entrar (flame) */}
          <Button
            label="Entrar"
            variant="flame"
            size="lg"
            fullWidth
            loading={submitting}
            onPress={handleSubmit}
            disabled={submitting}
            className="mt-6"
          />

          {/* dados de exemplo — sempre na fase 1 (decisão do Orquestrador) */}
          <View className="mt-6 items-center">
            <Text variant="caption" tone="ink" className="text-ink-fg/50 text-center">
              Ambiente de demonstração:{`\n`}use os dados de exemplo.
            </Text>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Preencher dados de exemplo"
              onPress={handleFillDemo}
              hitSlop={12}
              className="mt-2 active:opacity-70"
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <Text variant="body-sm" tone="primary" className="font-sans-medium">
                Preencher dados de exemplo
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
