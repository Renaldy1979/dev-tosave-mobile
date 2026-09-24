import { useEffect, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Logo } from "@/components/ui/Logo";
import { Text } from "@/components/ui/Text";
import { readSessionFlag } from "@/hooks/useCurrentUser";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { getCurrentUser } from "@/services/auth";
import { readOnboardingSeen } from "@/utils/onboarding";

/**
 * Splash animado (`docs/design/telas/01-onboarding-splash.md §1.2`).
 *
 * Inicia visualmente idêntico ao splash nativo do Expo (logo 220 pt
 * centralizada em `#0B0B0D`). Enquanto `getSession()` resolve,
 * enche uma barra flame de 0 → 100% em 400 ms (`easing.out`). Ao
 * resolver, escala 1 → 1.04 e faz fade out da logo + barra (250 ms)
 * antes do `router.replace` para o destino.
 *
 * Destino (fase 2 — app travado):
 * - 1ª abertura (`onboarding.seen` ausente) → `/onboarding`. Após o
 *   onboarding, o usuário cai em `/login` se não estiver logado.
 * - sem sessão → `/login` (tela cheia, não modal).
 * - com sessão → `/(drawer)`.
 *
 * Erro ao ler storage: trata como "sem onboarding visto" / "sem
 * sessão" e segue para o destino (spec §1.3).
 */
export default function Index() {
  const reduced = useReducedMotion();
  const logoOpacity = useSharedValue(1);
  const logoScale = useSharedValue(1);
  const barWidth = useSharedValue(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;

    const decide = async () => {
      const [seen, hasSession] = await Promise.all([
        readOnboardingSeen(),
        readSessionFlag().catch(() => false),
      ]);

      // Defesa contra flag stale: confirma com o service.
      let effectiveSession = hasSession;
      if (hasSession) {
        try {
          const user = await getCurrentUser();
          if (!user && !cancelled) {
            await AsyncStorage.removeItem("tosave.session").catch(() => undefined);
            effectiveSession = false;
          }
        } catch {
          // ignora — a navegação prossegue
        }
      }
      if (cancelled) return;

      // Fase 2: app travado. Sem sessão não se entra no app — vai
      // para o `/login` (tela cheia). O onboarding continua só na 1ª
      // abertura (antes do login).
      let dest: "/onboarding" | "/login" | "/(drawer)";
      if (!seen) {
        dest = "/onboarding";
      } else if (!effectiveSession) {
        dest = "/login";
      } else {
        dest = "/(drawer)";
      }

      // Fade out da logo + barra (250 ms), escala 1 → 1.04, depois navega.
      // Movimento reduzido: fade simples de 200 ms sem escala.
      if (reduced) {
        logoOpacity.value = withTiming(0, { duration: 200 });
      } else {
        logoOpacity.value = withTiming(0, { duration: 250 });
        logoScale.value = withTiming(1.04, { duration: 250, easing: Easing.out(Easing.ease) });
      }
      barWidth.value = withTiming(0, { duration: reduced ? 200 : 250 });

      setTimeout(() => {
        if (!cancelled) router.replace(dest);
      }, reduced ? 200 : 260);
    };

    // Enche a barra enquanto decide.
    barWidth.value = withTiming(1, {
      duration: reduced ? 0 : 400,
      easing: Easing.out(Easing.ease),
    });

    void decide();
    return () => {
      cancelled = true;
    };
  }, [mounted, reduced, barWidth, logoOpacity, logoScale]);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const barStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(100, barWidth.value * 100))}%`,
  }));

  return (
    <View className="flex-1 items-center justify-center bg-ink" style={{ paddingTop: 48 }}>
      <Animated.View style={logoStyle}>
        <Logo variant="dark" size="lg" />
      </Animated.View>
      {/* barra flame 120×3 pt, 32 pt abaixo da logo */}
      <View
        className="bg-flame-soft rounded-full overflow-hidden mt-8"
        style={{ width: 120, height: 3 }}
      >
        <Animated.View
          style={[barStyle, { backgroundColor: "#FF0000", height: 3 }]}
        />
      </View>
      <Text
        variant="caption"
        tone="ink"
        className="text-ink-fg/50 absolute bottom-10 text-center"
      >
        Sua coleção de
        {"\n"}miniaturas, organizada.
      </Text>
    </View>
  );
}
