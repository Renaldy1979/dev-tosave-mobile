import { Text as RNText } from "react-native";
import type { TextProps as RNTextProps } from "react-native";
import { cn } from "@/utils/cn";

/**
 * Variantes de tipografia. Espelham os tokens de `tailwind.config.js`
 * (fontFamily + fontSize) e limitam o `maxFontSizeMultiplier` por papel
 * para a escala dinâmica da acessibilidade não quebrar layout (§5.3 do
 * design system).
 *
 * `tone` aplica cor semântica — componentes nunca declaram cor direta,
 * só tom.
 */
export type TextVariant =
  | "display-xl"
  | "display-lg"
  | "display-md"
  | "h1"
  | "h2"
  | "h3"
  | "body-lg"
  | "body"
  | "body-sm"
  | "caption"
  | "eyebrow"
  | "tab";

export type TextTone =
  | "fg"
  | "muted"
  | "subtle"
  | "primary"
  | "accent"
  | "flame"
  | "danger"
  | "ink";

const variantClasses: Record<TextVariant, string> = {
  "display-xl": "font-display-black text-display-xl",
  "display-lg": "font-display-black text-display-lg",
  "display-md": "font-display-black text-display-md",
  h1: "font-display text-h1",
  h2: "font-display text-h2",
  h3: "font-sans-semibold text-h3",
  "body-lg": "font-sans text-body-lg",
  body: "font-sans text-body",
  "body-sm": "font-sans text-body-sm",
  caption: "font-sans text-caption",
  eyebrow: "font-eyebrow uppercase text-eyebrow",
  tab: "font-sans-medium text-tab",
};

const toneClasses: Record<TextTone, string> = {
  fg: "text-fg",
  muted: "text-fg-muted",
  subtle: "text-fg-subtle",
  primary: "text-primary-text",
  accent: "text-accent",
  flame: "text-flame",
  danger: "text-danger",
  ink: "text-ink-fg",
};

/**
 * Limite de `allowFontScaling` por papel. Display, tab e eyebrow não
 * podem estourar muito porque quebram grid e hero; corpo aceita mais.
 */
const multiplierByVariant: Record<TextVariant, number> = {
  "display-xl": 1.2,
  "display-lg": 1.2,
  "display-md": 1.2,
  h1: 1.4,
  h2: 1.4,
  h3: 1.4,
  "body-lg": 1.6,
  body: 1.6,
  "body-sm": 1.6,
  caption: 1.6,
  eyebrow: 1.2,
  tab: 1.2,
};

type Props = {
  variant?: TextVariant;
  tone?: TextTone;
  className?: string;
  numberOfLines?: number;
} & Omit<RNTextProps, "style" | "numberOfLines">;

export function Text({
  variant = "body",
  tone = "fg",
  className,
  numberOfLines,
  children,
  ...rest
}: Props) {
  return (
    <RNText
      {...rest}
      numberOfLines={numberOfLines}
      maxFontSizeMultiplier={multiplierByVariant[variant]}
      className={cn(variantClasses[variant], toneClasses[tone], className)}
    >
      {children}
    </RNText>
  );
}
