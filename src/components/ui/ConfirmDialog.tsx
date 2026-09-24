import { useState } from "react";
import { Trash2 } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Dialog } from "./Dialog";

/**
 * ConfirmDialog destrutivo (componentes.md §9.2).
 *
 * Ícone `Trash2` em círculo `bg-flame-soft`, cor `flame`. Título e
 * texto configuráveis; ações "Confirmar" (`danger`, loading) e
 * "Cancelar" (`secondary`). Haptic `Warning` ao confirmar. Nunca usar
 * `Alert.alert` para isso.
 */
type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  /** Rótulo do botão destrutivo (padrão "Remover"). */
  confirmLabel?: string;
  /** Rótulo do botão de cancelar (padrão "Cancelar"). */
  cancelLabel?: string;
  onConfirm: () => Promise<void> | void;
};

export function ConfirmDialog({
  open,
  onClose,
  title = "Remover da coleção?",
  description,
  confirmLabel = "Remover",
  cancelLabel = "Cancelar",
  onConfirm,
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      icon={Trash2}
      iconTone="flame"
      actions={[
        { label: confirmLabel, onPress: handleConfirm, variant: "danger", loading },
        { label: cancelLabel, onPress: onClose, variant: "secondary" },
      ]}
    />
  );
}
