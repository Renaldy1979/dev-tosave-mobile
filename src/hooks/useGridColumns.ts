import { useMemo } from "react";
import { useWindowDimensions, type ViewStyle } from "react-native";

/** Margem lateral do grid (16 pt de cada lado, `px-4`). */
export const GRID_GUTTER = 16;
/** Espaço entre colunas e entre linhas do grid. */
export const GRID_GAP = 12;

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
  return columnsFor(width);
}

function columnsFor(width: number): number {
  if (width < 360) return 1;
  if (width < 600) return 2;
  if (width < 900) return 3;
  return 4;
}

export type GridLayout = {
  columns: number;
  /** Largura fixa de cada card: `(tela − 16×2 − 12×(cols−1)) / cols`. */
  itemWidth: number;
  /** Margem lateral efetiva (16 pt + a sobra do arredondamento, dividida
   *  igualmente entre os dois lados para o grid ficar centralizado). */
  side: number;
  gap: number;
  /**
   * Estilo da célula de uma `FlashList` com `numColumns`. A FlashList dá
   * a cada célula `largura / cols`; este deslocamento põe o card de
   * `itemWidth` na posição exata da sua coluna, com margens simétricas.
   */
  cellStyle: (index: number) => ViewStyle;
};

/**
 * Geometria do grid de CarCards (Home, Busca, Coleção). Todos os cards
 * têm a mesma largura e o grid fica centralizado na tela.
 */
export function useGridLayout(): GridLayout {
  const { width } = useWindowDimensions();
  return useMemo(() => {
    const columns = columnsFor(width);
    const itemWidth = Math.floor(
      (width - GRID_GUTTER * 2 - GRID_GAP * (columns - 1)) / columns
    );
    const side = (width - itemWidth * columns - GRID_GAP * (columns - 1)) / 2;
    const cellWidth = width / columns;
    return {
      columns,
      itemWidth,
      side,
      gap: GRID_GAP,
      cellStyle: (index: number) => {
        const col = index % columns;
        return {
          paddingLeft: side + col * (itemWidth + GRID_GAP) - col * cellWidth,
          paddingBottom: GRID_GAP,
        };
      },
    };
  }, [width]);
}
