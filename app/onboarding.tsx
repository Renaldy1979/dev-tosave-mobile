import { useCallback, useRef, useState } from "react";
import { Dimensions, FlatList, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Heart, Share2, Layers } from "lucide-react-native";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Logo } from "@/components/ui/Logo";
import { Text } from "@/components/ui/Text";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/IconButton";
import { LogoCar } from "@/components/ui/Logo";
import { markOnboardingSeen } from "@/utils/onboarding";

const SCREEN = Dimensions.get("window");

type Slide = {
  title: string;
  body: string;
  illustration: React.ReactNode;
};

const SLIDES: Slide[] = [
  {
    title: "Explore o catálogo",
    body: "Séries, marcas e anos em um só lugar.",
    illustration: <IllustrateCatalog />,
  },
  {
    title: "Monte sua coleção",
    body: "Adicione suas miniaturas e controle as repetidas.",
    illustration: <IllustrateCollection />,
  },
  {
    title: "Compartilhe",
    body: "Mostre suas miniaturas para os amigos pelo WhatsApp.",
    illustration: <IllustrateShare />,
  },
];

/**
 * Onboarding (`docs/design/telas/01-onboarding-splash.md §2`).
 *
 * 3 slides em pager horizontal. CTA "Próximo" até o último, depois
 * vira "Começar" (variant `flame`). "Pular" some no último slide.
 *
 * "Pular" e "Começar" gravam `tosave.onboarding.seen = "1"` e fazem
 * `router.replace("/(drawer)")`. Falha ao gravar não bloqueia a
 * navegação (spec §2.4).
 */
export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  const goTo = useCallback(
    (next: number) => {
      setIndex(next);
      listRef.current?.scrollToIndex({ index: next, animated: true });
    },
    []
  );

  const onMomentumScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = event.nativeEvent.contentOffset.x;
    const i = Math.round(x / SCREEN.width);
    if (i !== index) setIndex(Math.max(0, Math.min(SLIDES.length - 1, i)));
  }, [index]);

  const finish = useCallback(async () => {
    await markOnboardingSeen();
    router.replace("/(drawer)");
  }, []);

  const isLast = index === SLIDES.length - 1;

  return (
    <ScreenContainer bg="ink" edges={["bottom"]}>
      {/* Pular (canto superior direito) */}
      <View
        className="flex-row justify-end px-4"
        style={{ paddingTop: insets.top + 8 }}
      >
        {!isLast ? (
          <Button
            label="Pular"
            variant="ghost"
            size="sm"
            onPress={finish}
            accessibilityLabel="Pular onboarding"
            className="active:bg-white/10"
          />
        ) : (
          // Placeholder de mesma altura para evitar salto no último slide.
          <View style={{ minHeight: 36 }} />
        )}
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={(_, i) => ({ length: SCREEN.width, offset: SCREEN.width * i, index: i })}
        renderItem={({ item }) => (
          <View style={{ width: SCREEN.width }} className="px-6">
            <View className="items-center justify-center" style={{ height: SCREEN.height * 0.45, marginTop: 16 }}>
              {item.illustration}
            </View>
            <Text
              variant="display-lg"
              tone="ink"
              className="text-ink-fg mt-4"
              accessibilityRole="header"
            >
              {item.title}
            </Text>
            <Text variant="body-lg" tone="ink" className="text-ink-fg/70 mt-2">
              {item.body}
            </Text>
          </View>
        )}
      />

      {/* indicador */}
      <View className="flex-row items-center justify-center gap-2 mt-8" accessibilityRole="tablist" accessibilityLabel={`Passo ${index + 1} de ${SLIDES.length}`}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            className="rounded-full"
            style={{
              width: i === index ? 24 : 8,
              height: 4,
              backgroundColor: i === index ? "#FF0000" : "rgba(255,255,255,0.25)",
            }}
          />
        ))}
      </View>

      {/* CTA */}
      <View className="px-6 mt-8" style={{ paddingBottom: Math.max(insets.bottom, 12) + 16 }}>
        <Button
          label={isLast ? "Começar" : "Próximo"}
          variant={isLast ? "flame" : "primary"}
          size="lg"
          fullWidth
          onPress={() => (isLast ? finish() : goTo(index + 1))}
        />
      </View>
    </ScreenContainer>
  );
}

/* ================================================================== */
/*                          ILUSTRAÇÕES (composição)                  */
/* ================================================================== */

/**
 * Ilustração do slide 1: três CarCards fictícios em leque.
 * Componentes reais reduzidos (sem interação).
 */
function IllustrateCatalog() {
  return (
    <View className="items-center justify-center w-full">
      <View className="flex-row items-end justify-center gap-2">
        <View style={{ transform: [{ rotate: "-6deg" }], opacity: 0.95 }}>
          <MockCard collector="001" title="'71 Datsun" />
        </View>
        <View style={{ marginBottom: 12 }}>
          <MockCard collector="024" title="Skyline R34" highlighted />
        </View>
        <View style={{ transform: [{ rotate: "6deg" }], opacity: 0.95 }}>
          <MockCard collector="107" title="RX-7 FD" />
        </View>
      </View>
    </View>
  );
}

function IllustrateCollection() {
  return (
    <View className="items-center justify-center w-full">
      <View className="rounded-lg bg-surface-2 border border-border overflow-hidden" style={{ width: 220, height: 165 }}>
        <View className="aspect-card bg-surface-3 items-center justify-center">
          <LogoCar width={120} />
        </View>
        <View className="p-3">
          <Text variant="eyebrow" tone="subtle">MATTEL · 2024</Text>
          <Text variant="body-sm" className="font-sans-semibold" numberOfLines={1}>
            '71 Datsun 510 Wagon
          </Text>
        </View>
      </View>
      <View className="absolute" style={{ top: 8, right: "30%" }}>
        <Badge variant="flame" size="sm">
          Repetido ×2
        </Badge>
      </View>
      <View className="absolute" style={{ top: 8, left: "30%" }}>
        <View
          className="rounded-full bg-flame items-center justify-center"
          style={{ width: 36, height: 36, shadowColor: "#FF3838", shadowOpacity: 0.6, shadowRadius: 16, shadowOffset: { width: 0, height: 0 } }}
        >
          <Heart size={18} color="#FFFFFF" fill="#FFFFFF" />
        </View>
      </View>
    </View>
  );
}

function IllustrateShare() {
  return (
    <View className="items-center justify-center w-full">
      <View className="rounded-lg bg-surface-2 border border-border overflow-hidden" style={{ width: 240 }}>
        <View className="aspect-card bg-surface-3 items-center justify-center">
          <LogoCar width={140} />
        </View>
        <View className="p-3">
          <Text variant="eyebrow" tone="subtle">MATTEL · 2024</Text>
          <Text variant="body-sm" className="font-sans-semibold" numberOfLines={1}>
            '71 Datsun 510 Wagon
          </Text>
        </View>
      </View>
      <View className="absolute" style={{ bottom: 30, right: "22%" }}>
        <View className="rounded-md bg-primary items-center justify-center" style={{ width: 44, height: 44 }}>
          <Share2 size={20} color="#0B0B0D" strokeWidth={1.75} />
        </View>
      </View>
    </View>
  );
}

function MockCard({ collector, title, highlighted }: { collector: string; title: string; highlighted?: boolean }) {
  return (
    <View
      className={`rounded-md bg-surface-2 border ${highlighted ? "border-primary" : "border-border"} overflow-hidden`}
      style={{ width: 96 }}
    >
      <View className="aspect-card bg-surface-3 items-center justify-center">
        <LogoCar width={64} />
      </View>
      <View className="p-1.5">
        <Text variant="caption" tone="accent" className="font-mono">#{collector}</Text>
        <Text variant="caption" numberOfLines={1}>{title}</Text>
      </View>
    </View>
  );
}
