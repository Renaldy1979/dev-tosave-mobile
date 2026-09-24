import {
  account,
  withServiceError,
  ServiceError,
} from "./_appwrite";
import {
  getCurrentSession,
  setCurrentSession,
} from "./_session";
import { getCurrentUser } from "./auth";
import type { User } from "@/types";

/**
 * `users.updateProfile` da spec de dados (fase 2 com Appwrite).
 *
 * - Nome: `account.updateName({ name })`.
 * - E-mail: `account.updateEmail({ email, password })`. O Appwrite
 *   exige a senha atual quando o e-mail muda. A tela passa `password`
 *   no input.
 *
 * Não toca em `role`, `status` ou `expo_push_token` — esses são
 * responsabilidade do portal (fase 3).
 */
export interface UpdateProfileInput {
  name: string;
  email: string;
  password?: string;
}

export type UpdateProfileError =
  | "password_required"
  | "invalid_password"
  | "email_in_use"
  | "network"
  | "unknown";

export type UpdateProfileResult =
  | { ok: true; user: User }
  | { ok: false; error: UpdateProfileError };

interface AppwriteUser {
  $id: string;
  name?: string;
  email?: string;
  status?: boolean;
  prefs?: Record<string, unknown>;
}

function toAppUser(u: AppwriteUser): User {
  return {
    id: u.$id,
    name: u.name ?? u.email ?? "",
    email: u.email ?? "",
    role: "COLLECTOR",
    status: u.status === false ? "blocked" : "active",
    expo_push_token:
      typeof u.prefs?.expoPushToken === "string" ? u.prefs.expoPushToken : null,
  };
}

export async function updateProfile(
  input: UpdateProfileInput
): Promise<UpdateProfileResult> {
  // Sessão restaurada também preenche o espelho via `getCurrentUser`.
  const current = getCurrentSession().user ?? (await getCurrentUser());
  if (!current) {
    return { ok: false, error: "unknown" };
  }

  try {
    // Nome primeiro (separado do e-mail).
    if (input.name.trim() !== current.name) {
      await withServiceError(() =>
        account.updateName({ name: input.name.trim() })
      );
    }
    // E-mail só se mudou e senha foi fornecida.
    if (
      input.email.trim().toLowerCase() !== current.email.toLowerCase()
    ) {
      if (!input.password) {
        return { ok: false, error: "password_required" };
      }
      try {
        await withServiceError(() =>
          account.updateEmail({
            email: input.email.trim().toLowerCase(),
            password: input.password as string,
          })
        );
      } catch (err) {
        const e = err as { code?: number; message?: string };
        if (e?.code === 401) return { ok: false, error: "invalid_password" };
        if (e?.code === 409) return { ok: false, error: "email_in_use" };
        if (err instanceof ServiceError && err.code === "network") {
          return { ok: false, error: "network" };
        }
        return { ok: false, error: "unknown" };
      }
    }
    // Recarrega o usuário atualizado.
    const updated = await withServiceError(() => account.get()).catch(() => null);
    const user = updated ? toAppUser(updated as AppwriteUser) : { ...current, name: input.name.trim(), email: input.email.trim().toLowerCase() };
    setCurrentSession({ user });
    return { ok: true, user };
  } catch (err) {
    if (err instanceof ServiceError && err.code === "network") {
      return { ok: false, error: "network" };
    }
    return { ok: false, error: "unknown" };
  }
}
