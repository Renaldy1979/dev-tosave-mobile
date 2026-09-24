import { useCallback } from "react";
import { useRouter } from "expo-router";
import { LogOut } from "lucide-react-native";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";

/**
 * Confirmação de "Sair" (`09-menu-drawer.md` §2.4). O mesmo diálogo, com
 * um único texto, serve ao rodapé do drawer e ao Perfil.
 *
 * Confirmar: encerra a sessão (`account.deleteSession("current")` via
 * `signOut`) e vai para o Login com `replace` — o voltar nunca reabre
 * as telas do app.
 */
export function SignOutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { signOut } = useCurrentUser();
  const { show } = useToast();

  const handleConfirm = useCallback(async () => {
    try {
      await signOut();
      onClose();
      router.replace("/login");
    } catch {
      show({ type: "danger", message: "Não foi possível sair agora." });
    }
  }, [signOut, onClose, router, show]);

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      icon={LogOut}
      title="Sair da sua conta?"
      description="Você vai precisar entrar de novo para ver sua coleção."
      confirmLabel="Sair"
      cancelLabel="Cancelar"
      onConfirm={handleConfirm}
    />
  );
}
