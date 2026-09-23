import { useWindowDimensions } from "react-native";

/**
 * Largura efetiva da janela descontando o gutter lateral.
 * A Home/Busca/Coleção reservam 16 pt de cada lado (`px-4`).
 */
const GUTTER = 32;

/**
 * Define o número de colunas do grid conforme a largura da tela.
 * Espelha `docs/design/design-system-mobile.md §6.3`:
 * - < 360 pt → 1 coluna (modo row no CarCard)
 * - 360–599 pt → 2 colunas
 * - 600–899 pt → 3 colunas
 * - ≥ 900 pt → 4 colunas
 */
export function useGridColumns(): number {
  const { width } = useWindowDimensions();
  if (width < 360) return 1;
  if (width < 600) return 2;
  if (width < 900) return 3;
  return 4;
}

/**
 * Largura de cada coluna descontando o gutter. `0` em telas < 360
 * porque o modo row usa a largura cheia (sem grid).
 */
export function useColumnWidth(): number {
  const { width } = useWindowDimensions();
  const columns = useGridColumns();
  if (columns <= 1) return width;
  return Math.floor((width - GUTTER - (columns - 1) * 12) / columns);
}
