import { api } from "./_http";

/**
 * Conta no backend próprio (`GET/PUT /v2/me`) — separado do usuário do
 * Appwrite (`auth.ts`, login/nome/e-mail). Por enquanto só o telefone
 * mora aqui, usado no Clube da Troca ("Revelar contato").
 */
export interface MeProfile {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  status: "active" | "blocked";
  phone: string | null;
}

export async function getMe(): Promise<MeProfile> {
  return api<MeProfile>("/v2/me");
}

/** `phone: null` limpa o telefone cadastrado. */
export async function updateMyPhone(phone: string | null): Promise<MeProfile> {
  return api<MeProfile>("/v2/me", { method: "PUT", body: { phone } });
}
