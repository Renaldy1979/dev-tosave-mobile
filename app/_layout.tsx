import "./global.css";

import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack } from "expo-router";
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
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="onboarding" />
            <Stack.Screen name="login" />
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
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
