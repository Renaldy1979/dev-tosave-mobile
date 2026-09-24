import { useSyncExternalStore } from "react";
import { EMPTY_APP_CONFIG, getAppConfig, getCachedAppConfig, type AppConfig } from "@/services/config";

/**
 * Config remota (`services/config.ts`) como store de módulo: carrega uma
 * vez no início do app — primeiro o cache do aparelho (funciona sem
 * rede), depois o servidor, que substitui e atualiza o cache. Enquanto
 * nada chega, os valores ficam vazios e os itens dependentes não
 * aparecem (sem botão morto).
 */
let config: AppConfig = EMPTY_APP_CONFIG;
const listeners = new Set<() => void>();
let started = false;

function set(next: AppConfig) {
  config = next;
  for (const l of listeners) l();
}

/** Dispara a carga (idempotente). Chamado no `_layout` raiz. */
export function loadAppConfig() {
  if (started) return;
  started = true;
  void (async () => {
    const cached = await getCachedAppConfig();
    if (cached) set(cached);
    try {
      set(await getAppConfig());
    } catch {
      // Sem rede: fica o cache (ou vazio).
    }
  })();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useAppConfig(): AppConfig {
  return useSyncExternalStore(subscribe, () => config, () => config);
}
