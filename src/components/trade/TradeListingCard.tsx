import { Pressable, View } from "react-native";
import { Text } from "../ui/Text";
import { Badge } from "../ui/Badge";
import { Skeleton } from "../ui/Skeleton";
import { CarImage } from "../car/CarImage";
import { TradeTypeBadge } from "./TradeTypeBadge";
import type { TradeListing } from "@/types";

const DESIRED_PREVIEW = 3;

/**
 * Card da vitrine e de "Meus anúncios": imagem do carro ofertado,
 * título, série/toy, selo TROCA/VENDA (+ preço), carros desejados (se
 * TROCA) e o nome do anunciante.
 */
export function TradeListingCard({ listing, onPress }: { listing: TradeListing; onPress: () => void }) {
  const showDesired = listing.type === "TRADE" && listing.desiredCars.length > 0;
  const isActive = listing.status === "ACTIVE";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${listing.car.title}, ${listing.type === "SALE" ? "à venda" : "para troca"}`}
      onPress={onPress}
      className="gap-3 p-3 rounded-lg bg-surface border border-border active:bg-surface-3"
    >
      <View className="flex-row gap-3">
        <CarImage uri={listing.car.imagemThumb} style={{ width: 88, height: 88, borderRadius: 8 }} />
        <View className="flex-1 min-w-0 gap-1">
          <Text variant="body" className="font-sans-semibold" numberOfLines={2}>
            {listing.car.title}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {[listing.car.serieTitle, listing.car.toy].filter(Boolean).join(" · ")}
          </Text>
          <View className="flex-row items-center gap-1.5 flex-wrap mt-0.5">
            <TradeTypeBadge type={listing.type} price={listing.price} />
            {!isActive ? (
              <Badge variant="outline" size="sm">
                {listing.status === "COMPLETED" ? "Concluído" : "Cancelado"}
              </Badge>
            ) : null}
          </View>
        </View>
      </View>

      {showDesired ? (
        <View className="gap-1.5">
          <Text variant="caption" tone="subtle">
            PROCURA
          </Text>
          <View className="flex-row flex-wrap gap-1.5">
            {listing.desiredCars.slice(0, DESIRED_PREVIEW).map((car) => (
              <Badge key={car.id} variant="neutral" size="sm">
                {car.title}
              </Badge>
            ))}
            {listing.desiredCars.length > DESIRED_PREVIEW ? (
              <Badge variant="outline" size="sm">
                +{listing.desiredCars.length - DESIRED_PREVIEW}
              </Badge>
            ) : null}
          </View>
        </View>
      ) : null}

      {listing.description ? (
        <Text variant="body-sm" tone="muted" numberOfLines={2}>
          {listing.description}
        </Text>
      ) : null}

      <Text variant="caption" tone="subtle" numberOfLines={1}>
        Por {listing.userName}
      </Text>
    </Pressable>
  );
}

export function TradeListingCardSkeleton() {
  return (
    <View className="gap-3 p-3 rounded-lg bg-surface border border-border">
      <View className="flex-row gap-3">
        <Skeleton.Rect style={{ width: 88, height: 88 }} />
        <View className="flex-1 gap-1.5 justify-center">
          <Skeleton.Rect style={{ height: 14, width: "80%" }} />
          <Skeleton.Rect style={{ height: 10, width: "50%" }} />
          <Skeleton.Rect style={{ height: 18, width: 70 }} />
        </View>
      </View>
    </View>
  );
}
