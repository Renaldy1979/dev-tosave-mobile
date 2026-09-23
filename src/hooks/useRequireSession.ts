import { useCallback } from "react";
import { router } from "expo-router";
import { useCurrentUser } from "./useCurrentUser";

/**
 * Contexto passado ao hook de login. `intent` é mutuamente exclusivo
 * com `next`: quando há intenção (ex.: adicionar carro), o login
 * devolve a ação pendente depois de autenticar.
 */
export type RequireSessionContext =
  | { intent: "add"; carId: string }
  | { next: string };

/**
 * Garante que o usuário está autenticado antes de continuar.
 *
 * Retorna `true` quando já há sessão (a ação deve prosseguir) ou
 * `false` quando o login foi aberto (a ação deve parar e aguardar o
 * retorno do modal). O login, ao concluir, executa a ação pendente
 * (intent) ou navega para `next`.
 */
export function useRequireSession(): (context: RequireSessionContext) => boolean {
  const { user } = useCurrentUser();

  return useCallback(
    (context: RequireSessionContext) => {
      if (user) return true;

      const params: Record<string, string> = {};
      if ("intent" in context) {
        params.intent = context.intent;
        params.carId = context.carId;
      } else {
        // `next` só aceita caminhos internos que começam com `/`.
        if (context.next.startsWith("/")) params.next = context.next;
      }
      router.push({ pathname: "/login", params });
      return false;
    },
    [user]
  );
}
