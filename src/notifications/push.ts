import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { registerPushToken, unregisterPushToken } from "@/services/notifications";

/**
 * Push (`expo-notifications`) — permissão, Expo push token e registro
 * no backend (`docs/API-V2.md`, `POST/DELETE /v2/me/push-token`).
 *
 * Degrada sem crash: emulador (`Device.isDevice`), sem `projectId`, ou
 * Expo Go (push remoto saiu do Expo Go a partir do SDK 53) só deixam
 * de registrar o token — nunca travam o app. Exige `expo-notifications`
 * no build nativo (plugin em `app.json`); em builds antigos, sem
 * reinstalar, a lib não funciona mas também não derruba o app.
 */

const ASKED_KEY = "tosave.pushAsked";
const TOKEN_KEY = "tosave.pushToken";
const ANDROID_CHANNEL_ID = "default";

/** Comportamento em primeiro plano: alerta + som, sem badge no ícone. */
export function configureNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: "Geral",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  } catch {
    // Expo Go antigo sem suporte a canal — ignora.
  }
}

export async function hasAskedPushPermission(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ASKED_KEY)) === "1";
  } catch {
    return false;
  }
}

async function markAskedPushPermission(): Promise<void> {
  try {
    await AsyncStorage.setItem(ASKED_KEY, "1");
  } catch {
    // ignora — pior caso, a explicação aparece de novo no próximo login.
  }
}

async function getStoredToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function setStoredToken(token: string | null): Promise<void> {
  try {
    if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
    else await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignora
  }
}

function getProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId;
}

async function fetchAndRegisterToken(): Promise<boolean> {
  await ensureAndroidChannel();
  const projectId = getProjectId();
  if (!projectId) return false;
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await registerPushToken(token);
    await setStoredToken(token);
    return true;
  } catch (err) {
    // Expo Go (SDK 53+), emulador sem Google Play Services ou sem
    // credencial de push configurada: degrada, sem token.
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn("[push] token indisponível", err);
    }
    return false;
  }
}

/**
 * Pede a permissão do sistema (a explicação do app já apareceu antes
 * disso) e, se concedida, registra o token. `false` em qualquer
 * degradação — nunca lança.
 */
export async function requestPushPermissionAndRegister(): Promise<boolean> {
  await markAskedPushPermission();
  if (!Device.isDevice) return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    const status =
      current.status === "granted" ? current.status : (await Notifications.requestPermissionsAsync()).status;
    if (status !== "granted") return false;
    return await fetchAndRegisterToken();
  } catch (err) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn("[push] falha ao pedir permissão", err);
    }
    return false;
  }
}

/**
 * Sessão restaurada com permissão já concedida antes (login anterior
 * ou reabertura do app): reenvia o token sem perguntar nada — ele pode
 * ter mudado.
 */
export async function syncPushTokenIfGranted(): Promise<boolean> {
  if (!Device.isDevice) return false;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") return false;
    return await fetchAndRegisterToken();
  } catch {
    return false;
  }
}

/** Logout: remove o token deste aparelho no servidor e localmente. */
export async function unregisterPushNotifications(): Promise<void> {
  const token = await getStoredToken();
  if (!token) return;
  try {
    await unregisterPushToken(token);
  } catch {
    // best-effort — o servidor pode limpar tokens mortos por conta própria.
  } finally {
    await setStoredToken(null);
  }
}
