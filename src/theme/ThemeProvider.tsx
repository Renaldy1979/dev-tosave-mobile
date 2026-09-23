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

/**
 * Reaplica `themeVars` numa subárvore com um `ThemeScope` que sobrescreve
 * o `scheme` no contexto: tudo dentro de `ThemeScope` lê cores da surface
 * indicada (ex.: superfícies ink sempre leem "dark", independente do tema
 * global). É o que evita o ícone de olho do Input ficar invisível sobre
 * ink no tema light.
 *
 * Quando não há `scheme` explícito, o pai já fornece o scheme "dark"
 * — usado em portais (Modal/BottomSheet) que ficam fora da árvore raiz.
 */
type ScopeProps = {
  scheme?: Scheme;
  className?: string;
  children: ReactNode;
};

export function ThemeScope({ scheme = "dark", className, children }: ScopeProps) {
  const parent = useContext(ThemeContext);
  const scopeValue = useMemo<ThemeContextValue>(
    () => ({
      // Mantém a preference global (Escuro/Claro/Sistema) — o usuário pode
      // estar no tema "light" e mesmo assim a surface ink continua sendo
      // "dark". Só o scheme resolto é forçado dentro do scope.
      scheme,
      preference: parent?.preference ?? "dark",
      setPreference: parent?.setPreference ?? (() => undefined),
      c: (name: Parameters<typeof color>[1], alpha = 1) => color(scheme, name, alpha),
    }),
    [scheme, parent?.preference, parent?.setPreference]
  );

  return (
    <ThemeContext.Provider value={scopeValue}>
      <View style={themeVars[scheme]} className={className}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
}
