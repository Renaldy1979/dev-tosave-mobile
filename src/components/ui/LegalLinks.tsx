import { Pressable, View } from "react-native";
import { useAppConfig } from "@/hooks/useAppConfig";
import { openExternal } from "@/utils/openExternal";
import { Text } from "./Text";
import { useToast } from "./Toast";

/**
 * Links de Termos de Uso e Política de Privacidade, vindos da config
 * remota (`app_config`). Link com URL vazia não aparece; sem nenhum,
 * o componente não renderiza nada (sem botão morto).
 *
 * - `consent`: frase do Cadastro, com os dois termos tocáveis.
 * - `footer`: "Termos de Uso · Privacidade" (rodapé do Login).
 *
 * `tone="ink"` para superfícies ink (Login e Cadastro).
 */
type Props = {
  variant: "consent" | "footer";
  tone?: "ink" | "default";
  className?: string;
};

export function LegalLinks({ variant, tone = "default", className }: Props) {
  const { termsUrl, privacyUrl } = useAppConfig();
  const { show } = useToast();
  if (!termsUrl && !privacyUrl) return null;

  const open = async (url: string) => {
    const ok = await openExternal(url);
    if (!ok) show({ type: "danger", message: "Não foi possível abrir o link." });
  };

  const muted = tone === "ink" ? "text-ink-fg/60" : "";
  const link = (label: string, url: string) => (
    <Text
      variant="body-sm"
      tone="primary"
      className="font-sans-medium"
      accessibilityRole="link"
      onPress={() => open(url)}
      suppressHighlighting
    >
      {label}
    </Text>
  );

  if (variant === "consent") {
    return (
      <Text
        variant="body-sm"
        tone={tone === "ink" ? "ink" : "muted"}
        className={`text-center ${muted} ${className ?? ""}`}
      >
        Ao criar a conta você concorda com{" "}
        {termsUrl ? link("os Termos de Uso", termsUrl) : null}
        {termsUrl && privacyUrl ? " e " : null}
        {privacyUrl ? link("a Política de Privacidade", privacyUrl) : null}.
      </Text>
    );
  }

  return (
    <View className={`flex-row items-center justify-center gap-2 ${className ?? ""}`}>
      {termsUrl ? <FooterLink label="Termos de Uso" onPress={() => open(termsUrl)} /> : null}
      {termsUrl && privacyUrl ? (
        <Text variant="caption" tone={tone === "ink" ? "ink" : "subtle"} className={muted}>
          ·
        </Text>
      ) : null}
      {privacyUrl ? <FooterLink label="Privacidade" onPress={() => open(privacyUrl)} /> : null}
    </View>
  );
}

function FooterLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      className="active:opacity-70 justify-center"
      style={{ minHeight: 44 }}
    >
      <Text variant="caption" tone="primary" className="font-sans-medium">
        {label}
      </Text>
    </Pressable>
  );
}
