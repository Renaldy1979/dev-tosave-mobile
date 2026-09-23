import { View } from "react-native";
import { User } from "lucide-react-native";
import { useTheme } from "@/theme/ThemeProvider";
import { Text } from "./Text";

/**
 * Avatar com iniciais sobre `bg-primary-soft` (componentes.md §C.4).
 *
 * - 32 pt (Header da Home), 56 pt, 88 pt (Perfil, com anel flame de 2 pt).
 * - `initials` opcional; sem nome → ícone `User`.
 * - `ring="flame"` aplica o anel gradiente flame (88 pt do Perfil).
 */
type Props = {
  initials?: string | null;
  size?: number;
  ring?: "flame" | "none";
  className?: string;
};

function deriveInitials(name?: string | null): string | null {
  if (!name) return null;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ initials, size = 32, ring = "none", className }: Props) {
  const { c } = useTheme();
  const text = initials ?? null;
  const ringSize = ring === "flame" ? size + 4 : size;
  const showRing = ring === "flame";
  const fontVariant = size >= 64 ? "h2" : size >= 40 ? "body-sm" : "caption";
  const wrapper = (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={text ? `Avatar de ${text}` : "Avatar"}
      className={`rounded-full bg-primary-soft items-center justify-center ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      {text ? (
        <Text
          variant={fontVariant as "h2" | "body-sm" | "caption"}
          className="font-display text-primary-text"
          numberOfLines={1}
        >
          {text}
        </Text>
      ) : (
        <User color={c("primary-text")} size={Math.max(14, Math.round(size * 0.45))} strokeWidth={1.75} />
      )}
    </View>
  );
  if (!showRing) return wrapper;
  // Anel flame: borda externa 2 pt com gradiente (approx: bg-flame + padding).
  return (
    <View
      className="rounded-full items-center justify-center bg-flame"
      style={{ width: ringSize, height: ringSize, padding: 2 }}
    >
      {wrapper}
    </View>
  );
}

export const deriveAvatarInitials = deriveInitials;
