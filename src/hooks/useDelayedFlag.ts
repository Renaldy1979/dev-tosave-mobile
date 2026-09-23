import { useEffect, useState } from "react";

/**
 * Liga uma flag só depois que `value` permaneceu `true` por `delay` ms.
 * Evita piscar o skeleton quando o service resolve em menos de 150 ms.
 *
 * Espelha `useDelayedFlag` do design system (`componentes.md §11`).
 */
export function useDelayedFlag(value: boolean, delay: number): boolean {
  const [delayed, setDelayed] = useState(false);

  useEffect(() => {
    if (!value) {
      setDelayed(false);
      return;
    }
    const timer = setTimeout(() => setDelayed(true), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return delayed;
}
