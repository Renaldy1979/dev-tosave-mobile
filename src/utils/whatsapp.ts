import { Linking } from "react-native";

/**
 * Abre o WhatsApp numa conversa com `phoneDigits` (DDD + número, sem
 * "55") e a mensagem pronta, via `wa.me` (funciona com ou sem o app
 * instalado, cai no navegador).
 */
export async function openWhatsAppChat(phoneDigits: string, message: string): Promise<boolean> {
  const digits = phoneDigits.replace(/\D/g, "");
  if (!digits) return false;
  const url = `https://wa.me/55${digits}?text=${encodeURIComponent(message)}`;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
