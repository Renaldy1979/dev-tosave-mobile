import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Models } from "react-native-appwrite";
import { tablesDb, APPWRITE_DATABASE_ID, withServiceError } from "./_appwrite";

/**
 * Configuração remota do app (`app_config`, linha única `$id = "public"`,
 * leitura pública: vale antes do login). Nenhum link fica fixo no
 * código: Termos, Privacidade, e-mail de suporte e a URL de retorno da
 * recuperação de senha vêm daqui. Valor vazio = o item não aparece.
 */
export type AppConfig = {
  termsUrl: string;
  privacyUrl: string;
  supportEmail: string;
  passwordRecoveryUrl: string;
};

export const EMPTY_APP_CONFIG: AppConfig = {
  termsUrl: "",
  privacyUrl: "",
  supportEmail: "",
  passwordRecoveryUrl: "",
};

const CACHE_KEY = "tosave.appConfig.v1";

interface AppConfigRow extends Models.Row {
  termsUrl?: string | null;
  privacyUrl?: string | null;
  supportEmail?: string | null;
  passwordRecoveryUrl?: string | null;
}

function normalize(raw: Partial<Record<keyof AppConfig, unknown>>): AppConfig {
  const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  return {
    termsUrl: text(raw.termsUrl),
    privacyUrl: text(raw.privacyUrl),
    supportEmail: text(raw.supportEmail),
    passwordRecoveryUrl: text(raw.passwordRecoveryUrl),
  };
}

/** Lê a config no servidor e atualiza o cache local. */
export async function getAppConfig(): Promise<AppConfig> {
  const row = await withServiceError(() =>
    tablesDb.getRow<AppConfigRow>({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: "app_config",
      rowId: "public",
    })
  );
  const config = normalize(row);
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(config));
  } catch {
    // Cache é conveniência: falhar ao gravar não impede o uso.
  }
  return config;
}

/** Última config salva no aparelho (sem rede), ou `null`. */
export async function getCachedAppConfig(): Promise<AppConfig | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? normalize(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}
