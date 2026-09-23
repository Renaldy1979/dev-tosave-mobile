import { Image } from "expo-image";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "./Text";

/**
 * Logo da marca. Em superfícies ink (splash, onboarding, login, topo da
 * Home) usa sempre `logo.png` (versão escura). No restante usa
 * `logo-light.png` no tema light.
 *
 * Proporção fixa 644:241 (altura = largura × 0,374) — `_brand/logo*.png`.
 *
 * `width` em pt (96, 180, 220). A altura é calculada.
 */
type Props = {
  variant?: "auto" | "dark" | "light";
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE_PT: Record<"sm" | "md" | "lg", number> = {
  sm: 96,
  md: 180,
  lg: 220,
};

// Altura = largura × 0,374
const HEIGHT_FACTOR = 0.374;

// require com `number` para o expo-image aceitar assets externos.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const logoDark = require("../../../_brand/logo.png");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const logoLight = require("../../../_brand/logo-light.png");

export function Logo({ variant = "auto", size = "md", className }: Props) {
  const { scheme } = useTheme();
  const width = SIZE_PT[size];
  const height = Math.round(width * HEIGHT_FACTOR);

  const effective = variant === "auto" ? scheme : variant;
  const source = effective === "dark" ? logoDark : logoLight;

  return (
    <Image
      source={source}
      style={{ width, height }}
      contentFit="contain"
      accessibilityLabel="ToSave"
      // O expo-image aceita className via NativeWind no RN.
      className={className}
    />
  );
}

/**
 * Logo-car (silhueta do carro) — usada em marca d'água do login e no
 * EmptyState grande. Mantida em componente para reaproveitar a fonte
 * única.
 */
export function LogoCar({ width = 220, className }: { width?: number; className?: string }) {
  const height = Math.round(width * (160 / 644));
  return (
    <Image
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      source={require("../../../_brand/logo-car.png")}
      style={{ width, height }}
      contentFit="contain"
      accessibilityLabel=""
      className={className}
    />
  );
}

/**
 * Versão só com texto (fallback para quando o asset falhou). Aparece
 * raramente; existe porque o AsyncStorage já é confiável mas o splash
 * precisa de uma opção de emergência em testes.
 */
export function LogoText({ tone = "fg" }: { tone?: "fg" | "ink" }) {
  return <Text variant="display-lg" tone={tone}>TOSAVE</Text>;
}
