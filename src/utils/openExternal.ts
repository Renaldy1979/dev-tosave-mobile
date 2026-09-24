import * as WebBrowser from "expo-web-browser";

/**
 * Abre um link externo (Termos, Privacidade) no navegador do sistema
 * dentro do app (`expo-web-browser`). Devolve `false` se não abriu.
 */
export async function openExternal(url: string): Promise<boolean> {
  if (!url) return false;
  try {
    await WebBrowser.openBrowserAsync(url);
    return true;
  } catch {
    return false;
  }
}
