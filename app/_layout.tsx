import "./global.css";

import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import {
  Saira_600SemiBold,
  Saira_700Bold,
  Saira_800ExtraBold_Italic,
} from "@expo-google-fonts/saira";
import { SairaCondensed_600SemiBold } from "@expo-google-fonts/saira-condensed";
import { JetBrainsMono_500Medium } from "@expo-google-fonts/jetbrains-mono";
import * as SplashScreen from "expo-splash-screen";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { CollectionProvider } from "@/hooks/useCollectionStore";
import { useCurrentUser } from "@/hooks/useCurrentUser";

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export { ErrorBoundary } from "expo-router";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Saira_600SemiBold,
    Saira_700Bold,
    Saira_800ExtraBold_Italic,
    SairaCondensed_600SemiBold,
    JetBrainsMono_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <BottomSheetModalProvider>
            <ToastProvider>
              <CollectionProvider>
                <StatusBar style="light" />
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="onboarding" />
                  {/* Login: tela de stack normal e raiz quando não há sessão
                      (sempre entra por `replace`; sem gesto de voltar). */}
                  <Stack.Screen name="login" options={{ animation: "fade", gestureEnabled: false }} />
                  <Stack.Screen name="cadastro" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen
                    name="car/[id]"
                    options={{
                      animation: "slide_from_right",
                      gestureEnabled: true,
                      fullScreenGestureEnabled: true,
                    }}
                  />
                </Stack>
                <AuthGate />
              </CollectionProvider>
            </ToastProvider>
          </BottomSheetModalProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * AuthGate — redireciona para `/login` quando a sessão cai enquanto
 * o usuário está numa rota protegida (tabs ou car/[id]). O splash
 * (`app/index.tsx`) já cuida da entrada inicial; o cadasto
 * (`/cadastro`) também fica acessível sem sessão.
 */
function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const { user, sessionExpired } = useCurrentUser();

  useEffect(() => {
    if (user) return;
    const top = segments[0];
    // Rotas que exigem sessão: tabs e detalhe do carro. `/login`,
    // `/cadastro`, `/onboarding` e `/` (splash) ficam acessíveis
    // sem sessão para que o usuário possa entrar ou criar conta.
    const protectedRoute =
      top === "(tabs)" || top === "car";
    if (protectedRoute) {
      // 401 durante o uso → Login com o aviso "Sua sessão expirou.".
      router.replace(
        sessionExpired ? { pathname: "/login", params: { reason: "expired" } } : "/login"
      );
    }
  }, [user, sessionExpired, segments, router]);

  return null;
}
