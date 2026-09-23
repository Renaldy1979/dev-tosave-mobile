import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Flag de "houve sessão em algum momento" — lida pelo splash para
 * decidir destino sem precisar chamar `account.get()`. Na fase 2 o
 * client Appwrite persiste a sessão em cookie/SecureStore, mas a
 * flag continua útil como dica de UX (se nunca houve sessão, vai
 * direto para o Login; se houve, mostra o splash com a logo por
 * mais tempo).
 */
const SESSION_FLAG_KEY = "tosave.session";

export async function readSessionFlag(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(SESSION_FLAG_KEY);
    return value === "1";
  } catch {
    return false;
  }
}

export async function writeSessionFlag(value: boolean): Promise<void> {
  try {
    if (value) await AsyncStorage.setItem(SESSION_FLAG_KEY, "1");
    else await AsyncStorage.removeItem(SESSION_FLAG_KEY);
  } catch {
    // ignora — em produção pode falhar (storage cheio, etc.) sem
    // bloquear o fluxo.
  }
}
