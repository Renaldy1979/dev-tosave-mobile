import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { Phone } from "lucide-react-native";
import { updateMyPhone } from "@/services";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Text } from "../ui/Text";

/** Só dígitos, 10 (fixo + DDD) ou 11 (celular + DDD). */
function onlyDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

/** "11987654321" → "(11) 98765-4321". */
export function formatPhone(digits: string): string {
  const d = onlyDigits(digits);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/**
 * BottomSheet "Telefone/WhatsApp" — reaproveitado no Perfil e no
 * bloqueio de "Anunciar" sem telefone (lote 3, item 5). Salva em
 * `PUT /v2/me { phone }`, dígitos só (DDD + número).
 */
export function PhoneSheet({
  open,
  onClose,
  currentPhone,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  currentPhone: string | null;
  onSaved: (phone: string) => void;
}) {
  const [value, setValue] = useState(currentPhone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setValue(currentPhone ?? "");
      setError(null);
    }
  }, [open, currentPhone]);

  const handleSave = useCallback(async () => {
    const digits = onlyDigits(value);
    if (digits.length < 10) {
      setError("Informe o DDD e o número completo.");
      return;
    }
    setSaving(true);
    try {
      await updateMyPhone(digits);
      onSaved(digits);
      onClose();
    } catch {
      setError("Não foi possível salvar agora. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }, [value, onSaved, onClose]);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Telefone / WhatsApp"
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
              onPress={() => {
                void handleSave();
              }}
            />
          </View>
        </View>
      }
    >
      <View className="px-5 gap-3 pb-2">
        <Text variant="body-sm" tone="muted">
          Usado só no Clube da Troca, quando alguém "revela o contato" do seu anúncio. Nunca aparece na
          listagem.
        </Text>
        <Input
          as="sheet"
          label="Telefone (com DDD)"
          value={formatPhone(value)}
          onChangeText={(t) => {
            setValue(onlyDigits(t));
            if (error) setError(null);
          }}
          error={error ?? undefined}
          leftIcon={Phone}
          keyboardType="phone-pad"
          autoComplete="tel"
          placeholder="(11) 98765-4321"
        />
      </View>
    </BottomSheet>
  );
}
