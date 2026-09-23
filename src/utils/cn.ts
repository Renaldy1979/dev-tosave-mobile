/**
 * Merge de classNames com desempate determinístico do Tailwind.
 *
 * Sem dependência de `clsx`/`tailwind-merge` (não instaladas). Faz o
 * suficiente para os componentes deste app: aceita strings, arrays e
 * objetos `{ chave: boolean }`, remove falsy e junta com espaço.
 *
 * O desempate "Tailwind" fica por conta do NativeWind processar o
 * `className` resultante — esta função não normaliza conflitos.
 */
export function cn(...inputs: Array<string | false | null | undefined>): string {
  return inputs.filter(Boolean).join(" ");
}
