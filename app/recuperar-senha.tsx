import { useCallback, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AlertCircle, CheckCircle2, ChevronLeft, Lock, Mail } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { useAppConfig } from "@/hooks/useAppConfig";
import { completePasswordRecovery, requestPasswordRecovery } from "@/services";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { IconButton } from "@/components/ui/IconButton";
import { Text } from "@/components/ui/Text";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Esqueci minha senha (`docs/design/telas/02-login.md` §7).
 *
 * Uma rota, dois modos:
 * - sem params → pedir o link (e-mail + "Enviar link"). A resposta é
 *   sempre a mesma, exista ou não a conta.
 * - com `userId` + `secret` (deep link do e-mail, `…://recuperar-senha`)
 *   → "Nova senha". Sucesso vai ao Login com "Senha alterada. Entre com
 *   a nova senha."; link expirado oferece pedir um novo.
 *
 * A URL de retorno vem da config remota (`passwordRecoveryUrl`); sem ela
 * o Login nem mostra o link para cá.
 */
export default function RecuperarSenha() {
  const params = useLocalSearchParams<{ userId?: string; secret?: string; expire?: string }>();
  const hasToken = Boolean(params.userId && params.secret);
  const expiredByDate = (() => {
    if (!params.expire) return false;
    const t = Date.parse(params.expire);
    return Number.isFinite(t) && t < Date.now();
  })();

  return hasToken ? (
    <NewPassword
      userId={params.userId as string}
      secret={params.secret as string}
      initiallyExpired={expiredByDate}
    />
  ) : (
    <RequestLink />
  );
}

/* ================================================================== */

function Shell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/login"));
  return (
    <ScreenContainer bg="ink" edges={["bottom"]} className="flex-1">
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 12 }}>
        <IconButton icon={ChevronLeft} variant="glass" size="md" accessibilityLabel="Voltar" onPress={goBack} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 16,
            paddingBottom: insets.bottom + 24,
            maxWidth: 440,
            width: "100%",
            alignSelf: "center",
          }}
        >
          <Text variant="display-lg" tone="ink" className="text-ink-fg" accessibilityRole="header">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="body" tone="ink" className="text-ink-fg/70 mt-2">
              {subtitle}
            </Text>
          ) : null}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function ErrorBanner({ text }: { text: string }) {
  const { c } = useTheme();
  return (
    <View
      accessibilityLiveRegion="polite"
      className="mt-4 rounded-md flex-row items-center gap-2 px-3 py-2.5 bg-flame-soft border"
      style={{ borderColor: c("flame", 0.4) }}
    >
      <AlertCircle size={18} color={c("flame")} strokeWidth={1.75} />
      <Text variant="body-sm" tone="flame" className="flex-1">
        {text}
      </Text>
    </View>
  );
}

/* ----------------------------- Pedir o link ----------------------------- */

function RequestLink() {
  const { c } = useTheme();
  const { passwordRecoveryUrl } = useAppConfig();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  const submit = useCallback(async () => {
    if (inFlight.current) return;
    setBanner(null);
    const value = email.trim();
    if (!value) return setEmailError("Informe seu e-mail.");
    if (!EMAIL_RE.test(value)) return setEmailError("E-mail inválido.");
    setEmailError(null);
    if (!passwordRecoveryUrl) {
      setBanner("Não foi possível enviar agora. Tente novamente.");
      return;
    }
    inFlight.current = true;
    setSubmitting(true);
    const result = await requestPasswordRecovery(value, passwordRecoveryUrl);
    setSubmitting(false);
    inFlight.current = false;
    if (result.ok) setSent(true);
    else if (result.error === "rate_limited") setBanner("Muitas tentativas. Aguarde alguns minutos e tente de novo.");
    else if (result.error === "network") setBanner("Sem conexão. Verifique sua internet e tente novamente.");
    else setBanner("Não foi possível enviar agora. Tente novamente.");
  }, [email, passwordRecoveryUrl]);

  if (sent) {
    return (
      <Shell title="Verifique seu e-mail">
        <View
          accessibilityLiveRegion="polite"
          className="mt-6 rounded-md flex-row items-start gap-2 px-3 py-2.5 bg-surface-2 border"
          style={{ borderColor: c("info", 0.4) }}
        >
          <CheckCircle2 size={18} color={c("info")} strokeWidth={1.75} />
          <Text variant="body-sm" className="flex-1">
            Se houver uma conta com esse e-mail, você vai receber um link para criar uma nova senha.
          </Text>
        </View>
      </Shell>
    );
  }

  return (
    <Shell title="Esqueci minha senha" subtitle="Enviamos um link para você criar uma nova senha.">
      <View className="mt-6">
        <Input
          label="E-mail"
          placeholder="voce@email.com"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            if (emailError) setEmailError(null);
          }}
          error={emailError ?? undefined}
          leftIcon={Mail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="username"
          returnKeyType="send"
          onSubmitEditing={submit}
          editable={!submitting}
          autoFocus
        />
      </View>
      {banner ? <ErrorBanner text={banner} /> : null}
      <Button
        label="Enviar link"
        variant="flame"
        size="lg"
        fullWidth
        loading={submitting}
        disabled={submitting}
        onPress={submit}
        className="mt-6"
      />
    </Shell>
  );
}

/* ------------------------------ Nova senha ------------------------------ */

function NewPassword({
  userId,
  secret,
  initiallyExpired,
}: {
  userId: string;
  secret: string;
  initiallyExpired: boolean;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [expired, setExpired] = useState(initiallyExpired);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);
  const passwordRef = useRef<TextInput>(null);

  const submit = useCallback(async () => {
    if (inFlight.current) return;
    setBanner(null);
    if (password.length < 8) {
      setPasswordError(password ? "Senha fraca. Use pelo menos 8 caracteres." : "Informe sua senha.");
      passwordRef.current?.focus();
      return;
    }
    setPasswordError(null);
    inFlight.current = true;
    setSubmitting(true);
    const result = await completePasswordRecovery(userId, secret, password);
    setSubmitting(false);
    inFlight.current = false;
    if (result.ok) {
      router.replace({ pathname: "/login", params: { reason: "password-reset" } });
      return;
    }
    switch (result.error) {
      case "expired":
        setExpired(true);
        break;
      case "weak_password":
        setPasswordError("Senha fraca. Use pelo menos 8 caracteres.");
        break;
      case "common_password":
        setPasswordError("Essa senha é muito comum. Escolha outra.");
        break;
      case "rate_limited":
        setBanner("Muitas tentativas. Aguarde alguns minutos e tente de novo.");
        break;
      case "network":
        setBanner("Sem conexão. Verifique sua internet e tente novamente.");
        break;
      default:
        setBanner("Não foi possível alterar sua senha agora. Tente novamente.");
    }
  }, [password, userId, secret, router]);

  if (expired) {
    return (
      <Shell title="Link expirado" subtitle="Este link expirou. Peça um novo.">
        <Button
          label="Pedir novo link"
          variant="flame"
          size="lg"
          fullWidth
          onPress={() => router.replace("/recuperar-senha")}
          className="mt-6"
        />
      </Shell>
    );
  }

  return (
    <Shell title="Nova senha" subtitle="Crie uma nova senha para sua conta.">
      <View className="mt-6">
        <Input
          ref={passwordRef}
          label="Nova senha"
          placeholder="••••••••"
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            if (passwordError) setPasswordError(null);
          }}
          error={passwordError ?? undefined}
          hint="Mínimo de 8 caracteres."
          leftIcon={Lock}
          variant="password"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={submit}
          editable={!submitting}
          autoFocus
        />
      </View>
      {banner ? <ErrorBanner text={banner} /> : null}
      <Button
        label="Salvar nova senha"
        variant="flame"
        size="lg"
        fullWidth
        loading={submitting}
        disabled={submitting}
        onPress={submit}
        className="mt-6"
      />
    </Shell>
  );
}
