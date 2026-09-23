import { useEffect, useState } from "react";

/**
 * Devolve `value` depois de `delay` ms sem mudança. Usado pelos campos
 * de busca para evitar filtrar a cada tecla (debounce de 300 ms no
 * SearchBar da Busca e na busca local da Coleção).
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
