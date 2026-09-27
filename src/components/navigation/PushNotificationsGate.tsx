import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { Bell } from "lucide-react-native";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { clearUnreadNotifications, refreshUnreadNotifications } from "@/hooks/useNotifications";
import {
  configureNotificationHandler,
  hasAskedPushPermission,
  requestPushPermissionAndRegister,
  syncPushTokenIfGranted,
  unregisterPushNotifications,
} from "@/notifications/push";
import { notificationRoute } from "@/notifications/routing";
import { Dialog } from "@/components/ui/Dialog";

/**
 * Gate de push (lote 2, `docs/PLANO-ENTREGA.md`), montado uma vez no
 * `_layout` raiz, fora da árvore das telas:
 *
 * - login (sessão passa de nenhuma para uma): se a permissão já foi
 *   concedida antes, só reenvia o token (pode ter mudado); se nunca
 *   foi pedida, mostra a explicação do app **antes** do prompt do
 *   sistema (item (1) do lote);
 * - logout: remove o token deste aparelho no servidor;
 * - toque na notificação (push, primeiro plano/segundo plano ou app
 *   fechado): navega por `data.type`/`data.targetId`, com a mesma
 *   lógica do item da caixa (item (3) do lote).
 */
export function PushNotificationsGate() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [explainOpen, setExplainOpen] = useState(false);
  const prevUserId = useRef<string | null>(null);
  const configured = useRef(false);
  const handledResponseId = useRef<string | null>(null);

  useEffect(() => {
    if (configured.current) return;
    configured.current = true;
    configureNotificationHandler();
  }, []);

  // Login/logout.
  useEffect(() => {
    const wasLoggedIn = prevUserId.current !== null;
    const isLoggedIn = Boolean(user);
    prevUserId.current = user?.id ?? null;
    if (isLoggedIn === wasLoggedIn) return;

    if (isLoggedIn) {
      void refreshUnreadNotifications();
      (async () => {
        const alreadyGranted = await syncPushTokenIfGranted();
        if (!alreadyGranted && !(await hasAskedPushPermission())) {
          setExplainOpen(true);
        }
      })();
    } else {
      clearUnreadNotifications();
      void unregisterPushNotifications();
    }
  }, [user]);

  // Toque na notificação: primeiro plano/segundo plano (listener) e
  // app fechado (última resposta, ao abrir).
  useEffect(() => {
    const handle = (response: Notifications.NotificationResponse | null) => {
      if (!response) return;
      const id = response.notification.request.identifier;
      if (handledResponseId.current === id) return;
      handledResponseId.current = id;
      const data = response.notification.request.content.data as
        | { type?: string; targetId?: string | null }
        | undefined;
      if (!data?.type) return;
      const route = notificationRoute(data.type, data.targetId ?? null);
      if (route) router.push(route);
    };

    Notifications.getLastNotificationResponseAsync()
      .then(handle)
      .catch(() => undefined);

    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  }, [router]);

  const handleActivate = async () => {
    setExplainOpen(false);
    const ok = await requestPushPermissionAndRegister();
    if (ok) void refreshUnreadNotifications();
  };

  return (
    <Dialog
      open={explainOpen}
      onClose={() => setExplainOpen(false)}
      title="Ativar notificações?"
      description="Avisamos quando sair uma notícia nova ou algo importante da sua coleção. Dá pra desligar quando quiser, nas configurações do aparelho."
      icon={Bell}
      actions={[
        { label: "Ativar", onPress: handleActivate, variant: "primary" },
        { label: "Agora não", onPress: () => setExplainOpen(false), variant: "secondary" },
      ]}
    />
  );
}
