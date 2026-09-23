import { Linking, Pressable, Share } from "react-native";
import * as Haptics from "expo-haptics";
import { Text } from "./Text";
import { WhatsAppIcon } from "./icons/WhatsAppIcon";
import { useTheme } from "@/theme/ThemeProvider";
import { useToast } from "./Toast";

/**
 * ShareWhatsAppButton (componentes.md §14).
 *
 * Variantes:
 * - `button` → botão "Compartilhar" com WhatsAppIcon (ActionBar do detalhe).
 * - `icon`   → IconButton ghost com WhatsAppIcon (header / sheet).
 *
 * Tenta abrir o app do WhatsApp via `Linking.openURL("whatsapp://send?text=…")`.
 * Sem WhatsApp instalado, cai para o share sheet nativo do RN. Se ambos
 * falharem, Toast danger.
 */
type CarData = {
  title: string;
  brandName?: string;
  year: number;
  collector: string;
  toy: string;
  serieTitle?: string;
};

type Props = {
  car: CarData;
  variant?: "button" | "icon";
  accessibilityLabel?: string;
  className?: string;
};

function buildMessage(car: CarData): string {
  const lines: string[] = [];
  lines.push("Olha essa miniatura da minha coleção no ToSave:");
  lines.push("");
  lines.push(`*${car.title}*`);
  const eyebrowParts: string[] = [];
  if (car.brandName) eyebrowParts.push(car.brandName);
  if (car.year) eyebrowParts.push(String(car.year));
  if (car.collector) eyebrowParts.push(`#${car.collector}`);
  if (eyebrowParts.length > 0) {
    lines.push(eyebrowParts.join(" · "));
  }
  if (car.serieTitle) {
    lines.push(`Série: ${car.serieTitle}`);
  }
  if (car.toy) {
    lines.push(`Código: ${car.toy}`);
  }
  return lines.join("\n");
}

async function share(message: string): Promise<boolean> {
  // 1) tenta abrir o app do WhatsApp direto
  try {
    const waUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
    const supported = await Linking.canOpenURL(waUrl);
    if (supported) {
      await Linking.openURL(waUrl);
      return true;
    }
  } catch {
    // cai pro Share nativo abaixo
  }
  // 2) share sheet nativo
  try {
    const result = await Share.share({ message });
    // `dismissedAction` é o usuário cancelando — não é erro.
    return result.action === Share.sharedAction;
  } catch {
    return false;
  }
}

/**
 * Helper exportado para a UI (ex.: menu de long-press da Coleção)
 * acionar o mesmo fluxo de compartilhamento sem renderizar o botão.
 */
export async function shareCar(car: CarData): Promise<boolean> {
  return share(buildMessage(car));
}

export function ShareWhatsAppButton({
  car,
  variant = "button",
  accessibilityLabel,
  className,
}: Props) {
  const { c } = useTheme();
  const { show } = useToast();

  const handle = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    const message = buildMessage(car);
    const ok = await share(message);
    if (!ok) {
      show({ type: "danger", message: "Não foi possível compartilhar agora." });
    }
  };

  if (variant === "icon") {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? "Compartilhar no WhatsApp"}
        onPress={handle}
        hitSlop={12}
        className={`items-center justify-center rounded-md active:bg-surface-3 ${className ?? ""}`}
        style={{ width: 40, height: 40 }}
      >
        <WhatsAppIcon size={20} color={c("fg")} />
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? "Compartilhar no WhatsApp"}
      onPress={handle}
      hitSlop={12}
      className={`flex-row items-center justify-center gap-2 rounded-md bg-surface-3 active:bg-border-strong px-4 ${className ?? ""}`}
      style={{ minHeight: 44 }}
    >
      <WhatsAppIcon size={18} color={c("fg")} />
      <Text variant="body" className="font-sans-medium text-fg">
        Compartilhar
      </Text>
    </Pressable>
  );
}

// Re-export para reuso sem precisar importar `View`/`Pressable`/`Text`.
export const ShareButtonIcon = WhatsAppIcon;
