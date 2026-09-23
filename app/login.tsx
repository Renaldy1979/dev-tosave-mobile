import { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AlertCircle, Lock, Mail, X } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme/ThemeProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { addToCollection, getCollectionQuantity } from "@/services/collection";
import { getDemoCredentials } from "@/services/auth";
import { LogoCar } from "@/components/ui/Logo";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Logo } from "@/components/ui/Logo";
import { IconButton } from "@/components/ui/IconButton";
import { ThemeScope } from "@/components/ui/ThemeScope";

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
  const { c } = useTheme();
  const { user, signIn, refresh } = useCurrentUser();

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
    const result = await signIn(email.trim(), password);
    if (!result.ok) {
      setBanner("E-mail ou senha incorretos.");
      setPassword("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      setSubmitting(false);
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
        }
      } catch {
        // Mantém sessão ativa; UI depois mostra erro se for o caso.
      }
    }

    // Reavalia o estado para garantir.
    await refresh();

    // Fecha modal e, em seguida, navega para `next` se houver.
    router.back();
    if (params.next && params.next.startsWith("/") && params.next !== "/login") {
      // Pequeno delay para o back terminar antes do navigate.
      setTimeout(() => {
        router.navigate(params.next as "/colecao" | "/perfil");
      }, 50);
    }
  }, [validate, signIn, email, password, variant, params.carId, params.next, refresh, router]);

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
    <ThemeScope className="flex-1">
      <View className="flex-1 bg-ink">
        {/* topo ink: palco da logo + watermark */}
        <View className="relative items-center justify-center overflow-hidden" style={{ height: 200 }}>
          <View className="absolute" style={{ width: 400, height: 200, opacity: 0.06 }}>
            <LogoCar width={400} />
          </View>
          <Logo variant="dark" size="md" />
          {/* Fechar (canto superior esquerdo) */}
          <View className="absolute top-3 left-3" style={{ paddingTop: 40 }}>
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
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text variant="display-lg" tone="ink" className="text-ink-fg">
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
              />
            </View>

            {/* banner de erro */}
            {banner ? (
              <View className="mt-4 rounded-md flex-row items-center gap-2 px-3 py-2.5 bg-flame-soft border" style={{ borderColor: "rgba(255,56,56,0.4)" }}>
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
              className="mt-6"
            />

            {/* dados de exemplo (DEV) */}
            {__DEV__ ? (
              <View className="mt-6 items-center">
                <Text variant="caption" tone="ink" className="text-ink-fg/50 text-center">
                  Ambiente de demonstração:{`\n`}use os dados de exemplo.
                </Text>
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="Preencher dados de exemplo"
                  onPress={handleFillDemo}
                  className="mt-2"
                  hitSlop={12}
                >
                  <Text variant="body-sm" tone="primary" className="font-sans-medium">
                    Preencher dados de exemplo
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </ThemeScope>
  );
}
