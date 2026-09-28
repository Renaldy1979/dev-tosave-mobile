import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Plus, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeProvider";
import {
  createTradeListing,
  getCarById,
  getCollectionPaged,
  getMe,
  listCarsPaged,
} from "@/services";
import type { CarListItem, CollectionItemWithCar, TradeType } from "@/types";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Header } from "@/components/ui/Header";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SearchBar } from "@/components/ui/SearchBar";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { CarImage } from "@/components/car/CarImage";
import { CarPickerRow } from "@/components/trade/CarPickerRow";
import { PhoneSheet } from "@/components/trade/PhoneSheet";

const MAX_DESIRED = 20;

type PhoneGateState = "checking" | "missing" | "ok" | "error";

/** Forma mínima do carro anunciado — `getCarById` (`CarDetail`, `serie.title`)
 *  e o picker da coleção (`CarListItem`, `serieTitle`) normalizam pra isso. */
type OfferedCar = { id: string; title: string; imagemThumb: string | null; serieTitle: string };

/**
 * Criar anúncio (lote 3, `docs/PLANO-ENTREGA.md`, itens 3 e 5). Chega
 * aqui com `carId` (botão "Anunciar" do Detalhe do carro) ou sem
 * (botão "+" do Clube da Troca — escolhe o carro na coleção).
 * Bloqueia sem telefone cadastrado, com o cadastro na hora.
 */
export default function NovoAnuncio() {
  const router = useRouter();
  const params = useLocalSearchParams<{ carId?: string }>();
  const insets = useSafeAreaInsets();
  const { c } = useTheme();
  const { show } = useToast();

  // ---------- Gate de telefone ----------
  const [phoneGate, setPhoneGate] = useState<PhoneGateState>("checking");
  const [phoneSheetOpen, setPhoneSheetOpen] = useState(false);

  const checkPhone = useCallback(async () => {
    setPhoneGate("checking");
    try {
      const me = await getMe();
      setPhoneGate(me.phone ? "ok" : "missing");
    } catch {
      setPhoneGate("error");
    }
  }, []);

  useEffect(() => {
    void checkPhone();
  }, [checkPhone]);

  // ---------- Carro ofertado ----------
  const [offeredCar, setOfferedCar] = useState<OfferedCar | null>(null);
  const [loadingOffered, setLoadingOffered] = useState(Boolean(params.carId));
  const [carPickerOpen, setCarPickerOpen] = useState(false);

  useEffect(() => {
    if (!params.carId) return;
    let alive = true;
    setLoadingOffered(true);
    getCarById(params.carId)
      .then((car) => {
        if (!alive) return;
        setOfferedCar(
          car ? { id: car.id, title: car.title, imagemThumb: car.imagemThumb, serieTitle: car.serie.title } : null
        );
      })
      .catch(() => undefined)
      .finally(() => {
        if (alive) setLoadingOffered(false);
      });
    return () => {
      alive = false;
    };
  }, [params.carId]);

  // ---------- Formulário ----------
  const [type, setType] = useState<TradeType>("TRADE");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [desiredCars, setDesiredCars] = useState<CarListItem[]>([]);
  const [desiredPickerOpen, setDesiredPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const toggleDesired = useCallback((car: CarListItem) => {
    setDesiredCars((cur) => {
      if (cur.some((item) => item.id === car.id)) return cur.filter((item) => item.id !== car.id);
      if (cur.length >= MAX_DESIRED) return cur;
      return [...cur, car];
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    setFormError(null);
    if (!offeredCar) {
      setFormError("Escolha o carro que vai anunciar.");
      return;
    }
    let priceValue: number | undefined;
    if (type === "SALE") {
      priceValue = Number(price.replace(",", "."));
      if (!priceValue || priceValue <= 0) {
        setFormError("Informe um preço válido.");
        return;
      }
    }
    setSubmitting(true);
    const result = await createTradeListing({
      carId: offeredCar.id,
      type,
      price: priceValue,
      desiredCarIds: type === "TRADE" ? desiredCars.map((car) => car.id) : undefined,
      description: description.trim() || undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      setFormError(result.message);
      return;
    }
    show({ type: "success", message: "Anúncio publicado." });
    router.replace(`/anuncio/${result.listing.id}`);
  }, [offeredCar, type, price, desiredCars, description, router, show]);

  if (phoneGate === "checking") {
    return (
      <ScreenContainer bg="bg" edges={["bottom"]} className="bg-bg">
        <Header variant="stack" title="Anunciar" back />
        <View className="px-4 pt-6 gap-3">
          <Skeleton.Text lines={3} />
        </View>
      </ScreenContainer>
    );
  }

  if (phoneGate === "missing" || phoneGate === "error") {
    return (
      <ScreenContainer bg="bg" edges={["top", "bottom"]} className="bg-bg">
        <Header variant="stack" title="Anunciar" back />
        <View className="flex-1 items-center justify-center px-8">
          <EmptyState
            kind="no-content"
            description={
              phoneGate === "missing"
                ? "Cadastre um telefone/WhatsApp antes de anunciar — é assim que quem se interessar fala com você."
                : "Não foi possível carregar seus dados agora."
            }
            action={{
              label: phoneGate === "missing" ? "Cadastrar telefone" : "Tentar novamente",
              onPress: () => (phoneGate === "missing" ? setPhoneSheetOpen(true) : void checkPhone()),
            }}
          />
        </View>
        <PhoneSheet
          open={phoneSheetOpen}
          onClose={() => setPhoneSheetOpen(false)}
          currentPhone={null}
          onSaved={() => {
            setPhoneSheetOpen(false);
            setPhoneGate("ok");
          }}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer bg="bg" edges={["bottom"]} className="bg-bg">
      <Header variant="stack" title="Anunciar" back />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 20 }}
      >
        {/* Carro anunciado */}
        <View className="gap-2">
          <Text variant="eyebrow" tone="subtle">
            CARRO ANUNCIADO
          </Text>
          {loadingOffered ? (
            <Skeleton.Rect style={{ height: 64 }} />
          ) : offeredCar ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Trocar carro anunciado, atualmente ${offeredCar.title}`}
              onPress={() => setCarPickerOpen(true)}
              className="flex-row items-center gap-3 p-3 rounded-lg bg-surface border border-border active:bg-surface-3"
            >
              <CarImage uri={offeredCar.imagemThumb} style={{ width: 56, height: 56, borderRadius: 8 }} />
              <View className="flex-1 min-w-0">
                <Text variant="body" className="font-sans-semibold" numberOfLines={1}>
                  {offeredCar.title}
                </Text>
                <Text variant="caption" tone="muted" numberOfLines={1}>
                  {offeredCar.serieTitle}
                </Text>
              </View>
              <Text variant="body-sm" tone="primary" className="font-sans-medium">
                Trocar
              </Text>
            </Pressable>
          ) : (
            <Button
              label="Escolher carro da coleção"
              variant="outline"
              size="md"
              leftIcon={Plus}
              onPress={() => setCarPickerOpen(true)}
            />
          )}
        </View>

        {/* Tipo */}
        <View className="gap-2">
          <Text variant="eyebrow" tone="subtle">
            TIPO
          </Text>
          <SegmentedControl
            value={type}
            onChange={setType}
            accessibilityLabel="Tipo de anúncio"
            options={[
              { value: "TRADE", label: "Troca" },
              { value: "SALE", label: "Venda" },
            ]}
          />
        </View>

        {/* Preço */}
        {type === "SALE" ? (
          <Input
            label="Preço (R$)"
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            placeholder="50,00"
          />
        ) : null}

        {/* Carros desejados */}
        {type === "TRADE" ? (
          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text variant="eyebrow" tone="subtle">
                CARROS DESEJADOS (OPCIONAL)
              </Text>
              <Text variant="caption" tone="muted">
                {desiredCars.length}/{MAX_DESIRED}
              </Text>
            </View>
            <Button
              label="Buscar no catálogo"
              variant="outline"
              size="md"
              leftIcon={Plus}
              onPress={() => setDesiredPickerOpen(true)}
            />
            {desiredCars.length > 0 ? (
              <View className="flex-row flex-wrap gap-1.5 mt-1">
                {desiredCars.map((car) => (
                  <Pressable
                    key={car.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Remover ${car.title} dos desejados`}
                    onPress={() => toggleDesired(car)}
                    className="flex-row items-center gap-1 rounded-sm bg-surface-3 px-2 active:opacity-80"
                    style={{ height: 32 }}
                  >
                    <Text variant="body-sm" numberOfLines={1}>
                      {car.title}
                    </Text>
                    <X color={c("fg-muted")} size={14} strokeWidth={1.75} />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Descrição */}
        <View className="gap-1.5">
          <Text variant="body-sm" className="font-sans-medium">
            Descrição (opcional)
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={1000}
            placeholder="Detalhes da troca ou venda"
            placeholderTextColor={c("fg-subtle")}
            className="rounded-md bg-surface-2 border border-border-strong px-3.5 py-3 text-body text-fg"
            style={{ minHeight: 96, textAlignVertical: "top" }}
          />
        </View>

        {formError ? (
          <View
            accessibilityLiveRegion="polite"
            className="rounded-md px-3 py-2.5 bg-flame-soft border"
            style={{ borderColor: "rgba(255,56,56,0.4)" }}
          >
            <Text variant="body-sm" tone="flame">
              {formError}
            </Text>
          </View>
        ) : null}

        <Button
          label="Publicar anúncio"
          variant="primary"
          size="lg"
          fullWidth
          loading={submitting}
          onPress={() => {
            void handleSubmit();
          }}
        />
      </ScrollView>

      <CollectionCarPickerSheet
        open={carPickerOpen}
        onClose={() => setCarPickerOpen(false)}
        onSelect={(car) => {
          setOfferedCar(car);
          setCarPickerOpen(false);
        }}
      />
      <CatalogCarPickerSheet
        open={desiredPickerOpen}
        onClose={() => setDesiredPickerOpen(false)}
        excludeId={offeredCar?.id}
        selectedIds={desiredCars.map((car) => car.id)}
        onToggle={toggleDesired}
      />
    </ScreenContainer>
  );
}

/* ================================================================== */
/*                    ESCOLHER CARRO DA COLEÇÃO                        */
/* ================================================================== */

function CollectionCarPickerSheet({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (car: CarListItem) => void;
}) {
  const [term, setTerm] = useState("");
  const search = useDebouncedValue(term.trim(), 300);
  const [items, setItems] = useState<CollectionItemWithCar[]>([]);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setState("loading");
    getCollectionPaged({ q: search, pageSize: 60 })
      .then((page) => {
        if (!alive) return;
        setItems(page.items);
        setState("ok");
      })
      .catch(() => {
        if (alive) setState("error");
      });
    return () => {
      alive = false;
    };
  }, [open, search]);

  return (
    <BottomSheet open={open} onClose={onClose} title="Escolher carro" snapPoints={["70%", "95%"]} scrollable={false}>
      <View style={{ flex: 1 }}>
        <View className="px-5 pb-2">
          <SearchBar value={term} onChangeText={setTerm} placeholder="Buscar na coleção" />
        </View>
        <FlashList
          data={state === "ok" ? items : []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            state === "loading" ? (
              <View className="pt-4">
                <Skeleton.Text lines={4} />
              </View>
            ) : state === "error" ? (
              <ErrorState size="sm" />
            ) : (
              <EmptyState kind="no-cars" size="sm" description="Nenhuma miniatura na sua coleção." />
            )
          }
          renderItem={({ item }) => (
            <CarPickerRow car={item.car as CarListItem} selected={false} onPress={() => onSelect(item.car as CarListItem)} />
          )}
        />
      </View>
    </BottomSheet>
  );
}

/* ================================================================== */
/*                    CARROS DESEJADOS (CATÁLOGO)                      */
/* ================================================================== */

function CatalogCarPickerSheet({
  open,
  onClose,
  excludeId,
  selectedIds,
  onToggle,
}: {
  open: boolean;
  onClose: () => void;
  excludeId?: string;
  selectedIds: string[];
  onToggle: (car: CarListItem) => void;
}) {
  const [term, setTerm] = useState("");
  const search = useDebouncedValue(term.trim(), 300);
  const [items, setItems] = useState<CarListItem[]>([]);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setState("loading");
    listCarsPaged({ q: search, pageSize: 60 })
      .then((page) => {
        if (!alive) return;
        setItems(page.items.filter((car) => car.id !== excludeId));
        setState("ok");
      })
      .catch(() => {
        if (alive) setState("error");
      });
    return () => {
      alive = false;
    };
  }, [open, search, excludeId]);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Carros desejados"
      snapPoints={["80%", "95%"]}
      scrollable={false}
      footer={<Button label="Concluir" variant="primary" size="md" fullWidth onPress={onClose} />}
    >
      <View style={{ flex: 1 }}>
        <View className="px-5 pb-2">
          <SearchBar value={term} onChangeText={setTerm} placeholder="Buscar no catálogo" />
        </View>
        <FlashList
          data={state === "ok" ? items : []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            state === "loading" ? (
              <View className="pt-4">
                <Skeleton.Text lines={4} />
              </View>
            ) : state === "error" ? (
              <ErrorState size="sm" />
            ) : (
              <EmptyState kind="no-cars" size="sm" />
            )
          }
          renderItem={({ item }) => (
            <CarPickerRow car={item} selected={selectedIds.includes(item.id)} onPress={() => onToggle(item)} />
          )}
        />
      </View>
    </BottomSheet>
  );
}
