import { useCallback, useEffect, useRef, useState } from "react";
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
import { AlertCircle, Info, Lock, Mail } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { SignInError } from "@/services/auth";
import { LogoCar } from "@/components/ui/Logo";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Logo } from "@/components/ui/Logo";
import { useToast } from "@/components/ui/Toast";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Textos oficiais dos erros de `signIn` (`02-login.md` §5). */
const SIGN_IN_ERROR: Record<SignInError, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  blocked: "Esta conta está desativada.",
  rate_limited: "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
  network: "Sem conexão. Verifique sua internet e tente novamente.",
  unknown: "Não foi possível entrar agora. Tente novamente.",
};

/**
 * Login (`docs/design/telas/02-login.md`) — tela de entrada do app
 * quando não há sessão. Sem X de fechar: não há para onde voltar.
 *
 * Params (expo-router):
 * - `email` → vem preenchido (ex.: a partir do Cadastro).
 * - `reason=expired` → banner "Sua sessão expirou. Entre novamente."
 * - `reason=created` → banner "Conta criada. Entre para continuar."
 *
 * Com sessão ativa, vai direto para as tabs.
 */
export default function Login() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; reason?: string }>();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, signIn } = useCurrentUser();
  const { show } = useToast();

  // Com sessão (deep link, ou sessão restaurada), vai para as tabs.
  useEffect(() => {
    if (user) {
      router.replace("/(tabs)");
    }
  }, [user, router]);

  const infoBanner =
    params.reason === "expired"
      ? "Sua sessão expirou. Entre novamente."
      : params.reason === "created"
        ? "Conta criada. Entre para continuar."
        : null;

  const [email, setEmail] = useState(params.email ?? "");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(infoBanner !== null);
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<TextInput>(null);
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
    setShowInfo(false);
    if (!validate({ email: true, password: true })) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      if (!EMAIL_RE.test(email.trim())) emailRef.current?.focus();
      else passwordRef.current?.focus();
      return;
    }
    setSubmitting(true);

    // Bloqueia back enquanto envia.
    const backSub = BackHandler.addEventListener("hardwareBackPress", () => true);
    const result = await signIn(email.trim(), password);
    backSub.remove();
    setSubmitting(false);

    if (!result.ok) {
      setBanner(SIGN_IN_ERROR[result.error]);
      if (result.error === "invalid_credentials") {
        setPassword("");
        passwordRef.current?.focus();
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    show({ type: "success", message: "Bem-vindo de volta." });
    // O Login é a raiz do stack: `replace`, nunca `back`.
    router.replace("/(tabs)");
  }, [validate, signIn, email, password, router, show]);

  return (
    <ScreenContainer bg="ink" edges={["bottom"]} className="flex-1">
      {/* topo ink: palco da logo + marca d'água. Pinta a área da status
          bar; o conteúdo começa em `insets.top`. */}
      <View
        className="relative items-center justify-center overflow-hidden bg-ink"
        style={{ height: 220 + insets.top, paddingTop: insets.top }}
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
          style={{ width: "100%", height: 220, top: insets.top, opacity: 0.06 }}
        >
          <LogoCar width={260} />
        </View>
        <View style={{ maxWidth: 440, width: "100%" }} className="items-center">
          <Logo variant="dark" size="md" />
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
            Entre na sua conta
          </Text>
          <Text variant="body" tone="ink" className="text-ink-fg/70 mt-2">
            Sua coleção de miniaturas, organizada.
          </Text>

          {/* banner informativo (sessão expirada / conta criada) */}
          {showInfo && infoBanner ? (
            <View
              accessibilityLiveRegion="polite"
              className="mt-4 rounded-md flex-row items-center gap-2 px-3 py-2.5 bg-surface-2 border"
              style={{ borderColor: c("info", 0.4) }}
            >
              <Info size={18} color={c("info")} strokeWidth={1.75} />
              <Text variant="body-sm" className="flex-1">
                {infoBanner}
              </Text>
            </View>
          ) : null}

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
              autoFocus={!params.email}
              onSubmitEditing={() => passwordRef.current?.focus()}
              ref={emailRef}
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
              autoFocus={Boolean(params.email)}
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
              <Text variant="body-sm" tone="flame" className="flex-1">
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

          {/* Link "Criar conta" */}
          <View className="mt-6 items-center">
            <Text variant="caption" tone="ink" className="text-ink-fg/60 text-center">
              Ainda não tem conta?
            </Text>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Criar conta"
              onPress={() => router.push("/cadastro")}
              disabled={submitting}
              hitSlop={12}
              className="mt-2 active:opacity-70"
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <Text variant="body-sm" tone="primary" className="font-sans-medium">
                Criar conta
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
