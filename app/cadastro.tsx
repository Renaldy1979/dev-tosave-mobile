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
import { useFocusEffect, useRouter } from "expo-router";
import { ChevronLeft, Lock, Mail, User } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/components/ui/Toast";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { IconButton } from "@/components/ui/IconButton";
import { Logo } from "@/components/ui/Logo";
import { signUp, type SignUpError } from "@/services/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;
const MAX_NAME = 60;

/**
 * Tela de Cadastro (`docs/design/telas/08-cadastro.md`).
 *
 * Fluxo da fase 2 — app travado:
 * - sem sessão: renderiza o formulário;
 * - com sessão: redireciona para `/(drawer)` sem renderizar.
 *
 * Campos: Nome, E-mail, Senha. Sem confirmação de senha. Validação
 * local (mínimo 8 caracteres) + erro do servidor (`signUp` → `SignUpError`).
 */
export default function Cadastro() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { user, refresh } = useCurrentUser();
  const { show } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  // Com sessão, volta direto para o app.
  useFocusEffect(
    useCallback(() => {
      if (user) router.replace("/(drawer)");
    }, [user, router])
  );

  // Bloqueia back enquanto envia.
  useEffect(() => {
    if (!submitting) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, [submitting]);

  const validate = useCallback(() => {
    const trimmedName = name.trim();
    let ok = true;
    if (trimmedName.length < 2) {
      setNameError("Informe seu nome.");
      ok = false;
    } else if (trimmedName.length > MAX_NAME) {
      setNameError("Use no máximo 60 caracteres.");
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
    if (password.length === 0) {
      setPasswordError("Crie uma senha.");
      ok = false;
    } else if (password.length < MIN_PASSWORD) {
      setPasswordError("A senha precisa ter pelo menos 8 caracteres.");
      ok = false;
    } else {
      setPasswordError(null);
    }
    return ok;
  }, [name, email, password]);

  const focusFirstError = useCallback(() => {
    if (nameError) {
      // O Input de Nome está no topo do formulário; o teclado
      // genérico do `ScrollView` cuida de mostrar o teclado. Não
      // temos ref do primeiro Input (sem `Input as="top"`), então o
      // usuário rola e toca manualmente.
    } else if (emailError) {
      emailRef.current?.focus();
    } else if (passwordError) {
      passwordRef.current?.focus();
    }
  }, [nameError, emailError]);

  // Volta ao Login; sem histórico (deep link), substitui pela raiz.
  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/login");
  }, [router]);

  const handleSubmit = useCallback(async () => {
    setBanner(null);
    if (!validate()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      focusFirstError();
      return;
    }
    setSubmitting(true);

    const backSub = BackHandler.addEventListener("hardwareBackPress", () => true);

    let result: Awaited<ReturnType<typeof signUp>> | null = null;
    try {
      result = await signUp({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
    } catch {
      setBanner("Sem conexão. Verifique sua internet e tente novamente.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      setSubmitting(false);
      backSub.remove();
      return;
    }

    if (!result.ok && result.error === "session_failed") {
      // Conta criada, mas a sessão não abriu: segue para o Login.
      setSubmitting(false);
      backSub.remove();
      router.replace({
        pathname: "/login",
        params: { email: email.trim().toLowerCase(), reason: "created" },
      });
      return;
    }

    if (!result.ok) {
      handleServerError(result.error);
      setSubmitting(false);
      backSub.remove();
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    await refresh();

    show({
      type: "success",
      message: `Conta criada. Bem-vindo, ${result.user.name.split(" ")[0]}.`,
    });

    backSub.remove();
    setSubmitting(false);
    router.replace("/(drawer)");
  }, [
    validate,
    signUp,
    name,
    email,
    password,
    focusFirstError,
    refresh,
    show,
    router,
  ]);

  // Mapeia erros do Appwrite (mock) para o texto oficial.
  const handleServerError = useCallback(
    (err: SignUpError) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
      switch (err) {
        case "email_in_use":
          setEmailError("Este e-mail já está cadastrado.");
          setBanner(
            'Já existe uma conta com este e-mail. Toque em "Entrar com este e-mail" abaixo para entrar.'
          );
          break;
        case "weak_password":
          setPasswordError("Senha fraca. Use pelo menos 8 caracteres.");
          break;
        case "common_password":
          setPasswordError("Essa senha é muito comum. Escolha outra.");
          break;
        case "personal_data":
          setPasswordError("A senha não pode conter seu nome ou e-mail.");
          break;
        case "blocked":
          setBanner("Esta conta está desativada.");
          break;
        case "invalid_email":
          setEmailError("E-mail inválido.");
          break;
        case "rate_limited":
          setBanner("Muitas tentativas. Aguarde alguns minutos e tente de novo.");
          break;
        case "network":
          setBanner("Sem conexão. Verifique sua internet e tente novamente.");
          break;
        default:
          setBanner("Não foi possível criar sua conta agora. Tente novamente.");
      }
    },
    []
  );

  return (
    <ScreenContainer bg="ink" edges={["bottom"]} className="flex-1">
      {/* topo ink: logo + botão voltar. */}
      <View
        className="relative items-center justify-center overflow-hidden bg-ink"
        style={{ height: 180 + insets.top, paddingTop: insets.top }}
      >
        <View className="absolute left-3" style={{ top: insets.top + 8 }}>
          <IconButton
            icon={ChevronLeft}
            variant="glass"
            size="md"
            accessibilityLabel="Voltar"
            onPress={goBack}
            disabled={submitting}
          />
        </View>
        <Logo variant="dark" size="sm" />
      </View>

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
            Crie sua conta
          </Text>
          <Text variant="body" tone="ink" className="text-ink-fg/70 mt-2">
            Sua coleção de miniaturas, organizada.
          </Text>

          <View className="mt-6 gap-4">
            <Input
              label="Nome"
              placeholder="Como quer ser chamado"
              value={name}
              onChangeText={(t) => {
                setName(t);
                if (nameError) setNameError(null);
              }}
              onBlur={() => {
                const trimmed = name.trim();
                if (trimmed.length > 0 && trimmed.length < 2) {
                  setNameError("Informe seu nome.");
                } else if (trimmed.length > MAX_NAME) {
                  setNameError("Use no máximo 60 caracteres.");
                }
              }}
              error={nameError ?? undefined}
              leftIcon={User}
              autoComplete="name"
              textContentType="name"
              autoCapitalize="words"
              returnKeyType="next"
              editable={!submitting}
              autoFocus
              onSubmitEditing={() => emailRef.current?.focus()}
            />
            <Input
              label="E-mail"
              placeholder="voce@email.com"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                if (emailError) setEmailError(null);
              }}
              onBlur={() => {
                if (email.length > 0 && !EMAIL_RE.test(email.trim())) {
                  setEmailError("E-mail inválido.");
                }
              }}
              error={emailError ?? undefined}
              leftIcon={Mail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="username"
              returnKeyType="next"
              editable={!submitting}
              ref={emailRef}
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
            <Input
              label="Senha"
              placeholder="••••••••"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (passwordError) setPasswordError(null);
              }}
              onBlur={() => {
                if (password.length > 0 && password.length < MIN_PASSWORD) {
                  setPasswordError("A senha precisa ter pelo menos 8 caracteres.");
                }
              }}
              error={passwordError ?? undefined}
              leftIcon={Lock}
              variant="password"
              autoComplete="password-new"
              textContentType="newPassword"
              returnKeyType="go"
              editable={!submitting}
              onSubmitEditing={handleSubmit}
              ref={passwordRef}
              hint={passwordError ? undefined : "Mínimo de 8 caracteres."}
            />
          </View>

          {/* Banner de erro */}
          {banner ? (
            <View
              accessibilityLiveRegion="polite"
              className="mt-4 rounded-md flex-row items-center gap-2 px-3 py-2.5 bg-flame-soft border"
              style={{ borderColor: "rgba(255,56,56,0.4)" }}
            >
              <Text variant="body-sm" tone="flame" className="flex-1">
                {banner}
              </Text>
              {emailError === "Este e-mail já está cadastrado." ? (
                <Pressable
                  accessibilityRole="link"
                  accessibilityLabel="Entrar com este e-mail"
                  onPress={() =>
                    router.replace({ pathname: "/login", params: { email: email.trim().toLowerCase() } })
                  }
                  hitSlop={12}
                  style={{ minHeight: 44, justifyContent: "center" }}
                >
                  <Text variant="body-sm" tone="primary" className="font-sans-medium">
                    Entrar com este e-mail
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {/* CTA */}
          <Button
            label="Criar conta"
            variant="primary"
            size="lg"
            fullWidth
            loading={submitting}
            disabled={submitting}
            onPress={handleSubmit}
            className="mt-6"
          />

          {/* "Já tem conta? Entrar" */}
          <View className="mt-6 items-center">
            <Text variant="caption" tone="ink" className="text-ink-fg/60 text-center">
              Já tem conta?
            </Text>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Entrar"
              onPress={goBack}
              disabled={submitting}
              hitSlop={12}
              className="mt-2 active:opacity-70"
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <Text variant="body-sm" tone="primary" className="font-sans-medium">
                Entrar
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
