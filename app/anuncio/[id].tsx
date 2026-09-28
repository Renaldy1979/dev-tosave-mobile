import { useCallback, useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MessageCircle, Phone, RefreshCw, XCircle } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  cancelTradeListing,
  completeTradeListing,
  getTradeById,
  revealTradeContact,
} from "@/services";
import type { TradeListing } from "@/types";
import { openWhatsAppChat } from "@/utils/whatsapp";
import { useDelayedFlag } from "@/hooks/useDelayedFlag";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Header } from "@/components/ui/Header";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { CarImage } from "@/components/car/CarImage";
import { TradeTypeBadge } from "@/components/trade/TradeTypeBadge";

type LoadState = "loading" | "ok" | "error" | "not-found";

/**
 * Detalhe do anúncio (lote 3, `docs/PLANO-ENTREGA.md`). Stack fora do
 * drawer. Quem não é dono revela o contato (WhatsApp com mensagem
 * pronta); o dono finaliza ou cancela, com confirmação.
 */
export default function AnuncioDetalhe() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id ?? "";
  const insets = useSafeAreaInsets();
  const { user } = useCurrentUser();
  const { show } = useToast();

  const [listing, setListing] = useState<TradeListing | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [phone, setPhone] = useState<string | null | undefined>(undefined);
  const [revealing, setRevealing] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) {
      setLoadState("not-found");
      return;
    }
    setLoadState("loading");
    try {
      const item = await getTradeById(id);
      if (!item) {
        setLoadState("not-found");
        setListing(null);
        return;
      }
      setListing(item);
      setPhone(undefined);
      setLoadState("ok");
    } catch {
      setLoadState("error");
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const showSkeleton = useDelayedFlag(loadState === "loading", 150);
  const isOwner = Boolean(user && listing && listing.userId === user.id);

  const handleReveal = useCallback(async () => {
    if (!listing) return;
    setRevealing(true);
    try {
      setPhone(await revealTradeContact(listing.id));
    } catch {
      show({ type: "danger", message: "Não foi possível revelar o contato." });
    } finally {
      setRevealing(false);
    }
  }, [listing, show]);

  const handleWhatsApp = useCallback(async () => {
    if (!listing || !phone) return;
    const message = `Oi! Vi seu anúncio do ${listing.car.title} no ToSave...`;
    const ok = await openWhatsAppChat(phone, message);
    if (!ok) show({ type: "danger", message: "Não foi possível abrir o WhatsApp." });
  }, [listing, phone, show]);

  const handleComplete = useCallback(async () => {
    if (!listing) return;
    try {
      setListing(await completeTradeListing(listing.id));
      setCompleteOpen(false);
      show({ type: "success", message: "Anúncio finalizado." });
    } catch {
      show({ type: "danger", message: "Não foi possível finalizar agora." });
    }
  }, [listing, show]);

  const handleCancel = useCallback(async () => {
    if (!listing) return;
    try {
      await cancelTradeListing(listing.id);
      setListing({ ...listing, status: "CANCELLED" });
      setCancelOpen(false);
      show({ type: "info", message: "Anúncio cancelado." });
    } catch {
      show({ type: "danger", message: "Não foi possível cancelar agora." });
    }
  }, [listing, show]);

  if (loadState === "not-found") {
    return (
      <ScreenContainer bg="bg" edges={["top", "bottom"]} className="bg-bg">
        <Header variant="stack" title="Anúncio" />
        <View className="flex-1 items-center justify-center px-8">
          <EmptyState
            kind="no-content"
            description="Esse anúncio pode ter sido removido."
            action={{ label: "Voltar ao Clube da Troca", onPress: () => router.replace("/mais/troca") }}
          />
        </View>
      </ScreenContainer>
    );
  }

  if (loadState === "error") {
    return (
      <ScreenContainer bg="bg" edges={["top", "bottom"]} className="bg-bg">
        <Header variant="stack" title="Anúncio" />
        <View className="flex-1 items-center justify-center px-8">
          <ErrorState onRetry={load} />
        </View>
      </ScreenContainer>
    );
  }

  if (loadState === "loading" && showSkeleton) {
    return (
      <ScreenContainer bg="bg" edges={["bottom"]} className="bg-bg">
        <Header variant="stack" title="Carregando..." back />
        <View className="px-4 pt-4 gap-3">
          <Skeleton.Rect style={{ height: 220, width: "100%" }} />
          <Skeleton.Text lines={3} />
        </View>
      </ScreenContainer>
    );
  }

  if (!listing) {
    return (
      <ScreenContainer bg="bg" edges={["top", "bottom"]} className="bg-bg">
        <Header variant="stack" title="Anúncio" back />
      </ScreenContainer>
    );
  }

  const isActive = listing.status === "ACTIVE";
  const eyebrow = [listing.car.serieTitle, listing.car.toy, String(listing.car.year)].filter(Boolean).join(" · ");

  return (
    <ScreenContainer bg="bg" edges={["bottom"]} className="bg-bg">
      <Header variant="stack" title="Anúncio" back />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <CarImage uri={listing.car.imagemFull ?? listing.car.imagemThumb} style={{ width: "100%", height: 240 }} />
        <View className="px-4 pt-4 gap-3">
          <Text variant="eyebrow" tone="subtle" numberOfLines={1}>
            {eyebrow.toUpperCase()}
          </Text>
          <Text variant="display-md" className="font-display-black">
            {listing.car.title}
          </Text>
          <View className="flex-row items-center gap-1.5 flex-wrap">
            <TradeTypeBadge type={listing.type} price={listing.price} />
            {!isActive ? (
              <Badge variant="outline" size="sm">
                {listing.status === "COMPLETED" ? "Concluído" : "Cancelado"}
              </Badge>
            ) : null}
          </View>

          {listing.description ? (
            <View className="mt-2">
              <Text variant="h2">Detalhes</Text>
              <Text variant="body-lg" tone="muted" className="mt-1">
                {listing.description}
              </Text>
            </View>
          ) : null}

          {listing.type === "TRADE" && listing.desiredCars.length > 0 ? (
            <View className="mt-4">
              <Text variant="h2">Procura na troca</Text>
              <View className="gap-2 mt-2">
                {listing.desiredCars.map((car) => (
                  <View key={car.id} className="flex-row items-center gap-3">
                    <CarImage uri={car.imagemThumb} style={{ width: 40, height: 40, borderRadius: 6 }} />
                    <View className="flex-1 min-w-0">
                      <Text variant="body-sm" numberOfLines={1}>
                        {car.title}
                      </Text>
                      <Text variant="caption" tone="muted" numberOfLines={1}>
                        {car.serieTitle}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <Text variant="caption" tone="subtle" className="mt-4">
            Anunciado por {listing.userName}
          </Text>
        </View>
      </ScrollView>

      {/* Ações */}
      <View className="px-4 pt-3 bg-surface border-t border-border" style={{ paddingBottom: insets.bottom + 12 }}>
        {isOwner ? (
          isActive ? (
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button label="Cancelar" variant="outline" size="lg" fullWidth onPress={() => setCancelOpen(true)} />
              </View>
              <View className="flex-1">
                <Button label="Finalizar" variant="primary" size="lg" fullWidth onPress={() => setCompleteOpen(true)} />
              </View>
            </View>
          ) : (
            <Text variant="body-sm" tone="muted" className="text-center">
              {listing.status === "COMPLETED" ? "Você finalizou este anúncio." : "Você cancelou este anúncio."}
            </Text>
          )
        ) : isActive ? (
          phone !== undefined ? (
            phone ? (
              <Button label="Chamar no WhatsApp" variant="primary" size="lg" fullWidth leftIcon={MessageCircle} onPress={handleWhatsApp} />
            ) : (
              <Text variant="body-sm" tone="muted" className="text-center">
                O anunciante não tem telefone cadastrado.
              </Text>
            )
          ) : listing.hasContact ? (
            <Button
              label="Revelar contato"
              variant="primary"
              size="lg"
              fullWidth
              leftIcon={Phone}
              loading={revealing}
              onPress={handleReveal}
            />
          ) : (
            <Text variant="body-sm" tone="muted" className="text-center">
              O anunciante não tem telefone cadastrado.
            </Text>
          )
        ) : (
          <Text variant="body-sm" tone="muted" className="text-center">
            {listing.status === "COMPLETED" ? "Este anúncio já foi concluído." : "Este anúncio foi cancelado."}
          </Text>
        )}
      </View>

      <ConfirmDialog
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        title="Finalizar anúncio?"
        description="Marca a troca ou venda como concluída. Não dá para reabrir depois."
        confirmLabel="Finalizar"
        cancelLabel="Cancelar"
        icon={RefreshCw}
        onConfirm={handleComplete}
      />
      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancelar anúncio?"
        description="O anúncio sai da vitrine sem ser concluído."
        confirmLabel="Cancelar anúncio"
        cancelLabel="Voltar"
        icon={XCircle}
        onConfirm={handleCancel}
      />
    </ScreenContainer>
  );
}
