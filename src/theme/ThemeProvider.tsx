import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme as useRNColorScheme, View } from "react-native";
import { color, themeVars, type Scheme } from "./tokens";

export type ThemePreference = "dark" | "light" | "system";

const STORAGE_KEY = "tosave.theme";

type ThemeContextValue = {
  scheme: Scheme;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  /** Cor resolta para props que não aceitam className (ícones, tintColor, StatusBar). */
  c: (name: Parameters<typeof color>[1], alpha?: number) => string;
};
const ThemeContext = createContext<ThemeContextValue | null>(null);

const isScheme = (value: string | null): value is ThemePreference =>
  value === "dark" || value === "light" || value === "system";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useRNColorScheme() ?? "dark";
  const [preference, setPreferenceState] = useState<ThemePreference>("dark");

  useEffect(() => {
    let mounted = true;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AsyncStorage = require("@react-native-async-storage/async-storage").default;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value: string | null) => {
        if (mounted && isScheme(value)) setPreferenceState(value);
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  // O tema é aplicado pelas CSS variables de `themeVars` no View raiz, não pelo
  // color scheme do NativeWind — nenhum componente usa variantes `dark:`.
  const scheme: Scheme = preference === "system" ? (systemScheme === "light" ? "light" : "dark") : preference;

  const setPreference = (p: ThemePreference) => {
    setPreferenceState(p);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AsyncStorage = require("@react-native-async-storage/async-storage").default;
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => undefined);
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      scheme,
      preference,
      setPreference,
      c: (name, alpha = 1) => color(scheme, name, alpha),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scheme, preference],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={themeVars[scheme]} className="flex-1 bg-bg">
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme precisa estar dentro de <ThemeProvider>.");
  return ctx;
}
