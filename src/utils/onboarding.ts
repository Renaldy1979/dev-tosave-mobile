import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Chave AsyncStorage que marca o onboarding como visto.
 * Centralizada aqui para que tanto o splash quanto o onboarding
 * e o "Rever apresentação" do Perfil compartilhem o mesmo valor.
 */
export const ONBOARDING_KEY = "tosave.onboarding.seen";

/**
 * Lê o flag de onboarding visto. Resolve `true` quando já visto,
 * `false` quando nunca visto ou em erro de leitura.
 */
export async function readOnboardingSeen(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(ONBOARDING_KEY);
    return value === "1";
  } catch {
    return false;
  }
}

/**
 * Marca o onboarding como visto.
 */
export async function markOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, "1");
  } catch {
    // ignora — a navegação prossegue mesmo sem storage (spec §1.3).
  }
}

/**
 * Limpa o flag para que o onboarding apareça novamente na próxima
 * abertura. Usado pelo item "Rever apresentação" no Perfil.
 */
export async function clearOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
  } catch {
    // ignora
  }
}
