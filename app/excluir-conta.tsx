import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, KeyboardAvoidingView, Platform, ScrollView, TextInput, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { AlertCircle, AlertTriangle, Lock } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCollectionStore } from "@/hooks/useCollectionStore";
import { deleteAccount, type DeleteAccountError } from "@/services";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Header } from "@/components/ui/Header";
import { Text } from "@/components/ui/Text";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

/** Textos oficiais dos erros em banner (`07-perfil.md` §5.1). */
const BANNER_ERROR: Record<Exclude<DeleteAccountError, "wrong_password">, string> = {
  rate_limited: "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
  network: "Sem conexão. Verifique sua internet e tente novamente.",
  unknown: "Não foi possível excluir sua conta agora. Tente novamente.",
};

/**
 * Excluir conta (`docs/design/telas/07-perfil.md` §5.1): tela de stack
 * que explica o que é apagado, pede a senha atual e chama a Function
 * `account-delete`. Enquanto envia, voltar, gesto e back do Android
 * ficam bloqueados.
 *
 * Sucesso: vai para o Login com `reason=deleted` e só então limpa a
 * sessão local (o servidor já derrubou todas as sessões).
 */
export default function ExcluirConta() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { endLocalSession } = useCurrentUser();
  const { summary } = useCollectionStore();

  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  // Back do Android bloqueado durante o envio.
  useEffect(() => {
    if (!submitting) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, [submitting]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/perfil");
  }, [router]);

  const handleSubmit = useCallback(async () => {
    setBanner(null);
    if (password.length === 0) {
      setPasswordError("Informe sua senha.");
      passwordRef.current?.focus();
      return;
    }
    setPasswordError(null);
    setSubmitting(true);
    const result = await deleteAccount(password);
    if (result.ok) {
      router.replace({ pathname: "/login", params: { reason: "deleted" } });
      endLocalSession();
      return;
    }
    setSubmitting(false);
    if (result.error === "wrong_password") {
      setPasswordError("Senha incorreta.");
      setPassword("");
      passwordRef.current?.focus();
    } else {
      setBanner(BANNER_ERROR[result.error]);
    }
  }, [password, router, endLocalSession]);

  const hasNumbers = summary.totalItems > 0;

  return (
    <ScreenContainer bg="bg" edges={["bottom"]} className="bg-bg">
      <Stack.Screen options={{ gestureEnabled: !submitting }} />
      <Header variant="stack" title="Excluir conta" back={!submitting} backFallback="/perfil" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 16 }}
        >
          <View className="items-center">
            <View
              className="rounded-full bg-flame-soft items-center justify-center"
              style={{ width: 64, height: 64 }}
            >
              <AlertTriangle size={32} color={c("flame")} strokeWidth={1.75} />
            </View>
          </View>
          <Text variant="h2" className="font-display mt-4" accessibilityRole="header">
            Excluir sua conta
          </Text>
          <Text variant="body" tone="muted" className="mt-2">
            Isso apaga para sempre:
          </Text>
          <View className="mt-2 gap-1">
            <Text variant="body">• sua conta (nome, e-mail e senha);</Text>
            <Text variant="body">
              {hasNumbers
                ? `• sua coleção (${summary.totalItems} ${summary.totalItems === 1 ? "unidade" : "unidades"}, ${summary.totalModels} ${summary.totalModels === 1 ? "modelo" : "modelos"});`
                : "• sua coleção;"}
            </Text>
            <Text variant="body">• suas estatísticas.</Text>
          </View>
          <Text variant="body-sm" tone="flame" className="font-sans-semibold mt-3">
            Essa ação é permanente e não pode ser desfeita.
          </Text>

          <Text variant="body-sm" tone="muted" className="mt-6">
            Para confirmar, digite sua senha atual.
          </Text>
          <View className="mt-3">
            <Input
              ref={passwordRef}
              label="Senha atual"
              placeholder="••••••••"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (passwordError && t.length > 0) setPasswordError(null);
              }}
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

          {banner ? (
            <View
              accessibilityLiveRegion="polite"
              className="mt-4 rounded-md flex-row items-center gap-2 px-3 py-2.5 bg-flame-soft border"
              style={{ borderColor: c("flame", 0.4) }}
            >
              <AlertCircle size={18} color={c("flame")} strokeWidth={1.75} />
              <Text variant="body-sm" tone="flame" className="flex-1">
                {banner}
              </Text>
            </View>
          ) : null}

          <View className="mt-6 gap-3">
            <Button
              label="Excluir minha conta"
              variant="danger"
              size="lg"
              fullWidth
              loading={submitting}
              disabled={submitting}
              onPress={handleSubmit}
              accessibilityHint="Apaga sua conta para sempre"
            />
            <Button
              label="Cancelar"
              variant="ghost"
              size="lg"
              fullWidth
              disabled={submitting}
              onPress={goBack}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
