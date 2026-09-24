import { useCallback, useState } from "react";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useCollectionStore } from "@/hooks/useCollectionStore";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import type { CarListItem } from "@/types";

/**
 * Coração dos grids (Home, tela da série): adiciona com 1 toque;
 * remove direto quando há 1 unidade e pede confirmação quando há mais
 * (remove todas, com "Desfazer"). Erro reverte (o store é otimista) e
 * mostra o Toast padrão.
 *
 * Devolve o handler e o diálogo, que a tela renderiza uma vez.
 */
export function useCollectionHeart(): {
  onToggle: (car: CarListItem) => Promise<void>;
  confirmDialog: React.ReactNode;
} {
  const router = useRouter();
  const collection = useCollectionStore();
  const { show } = useToast();
  const [confirmRemove, setConfirmRemove] = useState<CarListItem | null>(null);

  const onToggle = useCallback(
    async (car: CarListItem) => {
      const currentQty = collection.items[car.id] ?? 0;
      const wasIn = currentQty > 0;
      if (wasIn && currentQty > 1) {
        setConfirmRemove(car);
        return;
      }
      try {
        await collection.toggle(car.id);
        if (!wasIn) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
          show({
            type: "success",
            message: "Adicionada à sua coleção.",
            action: { label: "Ver", onPress: () => router.navigate("/colecao") },
          });
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
        }
      } catch {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
        show({ type: "danger", message: "Não foi possível atualizar sua coleção." });
      }
    },
    [collection, show, router]
  );

  const handleConfirmRemoveAll = useCallback(async () => {
    if (!confirmRemove) return;
    const car = confirmRemove;
    const previousQty = collection.items[car.id] ?? 0;
    setConfirmRemove(null);
    try {
      await collection.remove(car.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
      show({
        type: "info",
        message: `Removidas ${previousQty} unidades da sua coleção.`,
        action: {
          label: "Desfazer",
          onPress: () => collection.setQuantity(car.id, previousQty).catch(() => undefined),
        },
      });
    } catch {
      show({ type: "danger", message: "Não foi possível atualizar sua coleção." });
    }
  }, [confirmRemove, collection, show]);

  const confirmDialog = (
    <ConfirmDialog
      open={confirmRemove !== null}
      onClose={() => setConfirmRemove(null)}
      title={`Remover todas as ${collection.items[confirmRemove?.id ?? ""] ?? 0} unidades?`}
      description={
        confirmRemove ? `${confirmRemove.title} sai completamente da sua coleção.` : undefined
      }
      onConfirm={handleConfirmRemoveAll}
    />
  );

  return { onToggle, confirmDialog };
}
