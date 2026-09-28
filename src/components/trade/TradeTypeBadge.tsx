import { Badge } from "../ui/Badge";
import type { TradeType } from "@/types";

/** Formata preço em R$ (`123.5` → "R$ 123,50"). */
export function formatPrice(price: number): string {
  return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Selo do tipo de anúncio: TROCA (`primary`, laranja) ou VENDA
 * (`success`, verde) com o preço ao lado quando houver.
 */
export function TradeTypeBadge({ type, price }: { type: TradeType; price?: number | null }) {
  if (type === "SALE") {
    return (
      <Badge variant="success" size="sm">
        {price ? `VENDA · ${formatPrice(price)}` : "VENDA"}
      </Badge>
    );
  }
  return (
    <Badge variant="primary" size="sm">
      TROCA
    </Badge>
  );
}
