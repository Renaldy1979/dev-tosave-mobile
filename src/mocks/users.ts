import type { User } from "@/types";

/**
 * Usuário de exemplo usado pelo login simulado da fase 1. As credenciais
 * `demo@tosave.app` / `tosave123` (expostas por `auth.getDemoCredentials`)
 * são comparadas com este usuário em `services/auth.signIn`.
 *
 * O `expo_push_token` fica null até o app pedir permissão de notificação
 * (fora do escopo da fase 1).
 */
export const usersMock: User[] = [
  {
    id: "user-ana",
    name: "Ana Souza",
    email: "demo@tosave.app",
    role: "COLLECTOR",
    status: "active",
    expo_push_token: null,
  },
];
