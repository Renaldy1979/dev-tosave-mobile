import type { Href } from "expo-router";
import {
  ArrowLeftRight,
  Bell,
  ChartColumn,
  Heart,
  Home,
  Layers,
  Newspaper,
  Search,
  User,
  type LucideIcon,
} from "lucide-react-native";
import { getUnreadNotificationsSnapshot } from "@/hooks/useNotifications";

/**
 * Ordem oficial de navegação (`docs/briefings/navegacao-mais.md`), única
 * para os itens 1 a 9: a barra inferior mostra os 4 primeiros + Mais; a
 * tela Mais mostra todos os 9. Acrescentar um item custa uma linha aqui.
 *
 * `tabRoute`: o item está na barra — o toque troca de aba.
 * `moreRoute`: o item não está na barra — o toque empilha dentro da
 * aba Mais (`app/(tabs)/mais/`).
 */
export type NavItem = {
  key: string;
  label: string;
  icon: LucideIcon;
  tabRoute?: Href;
  moreRoute?: Href;
  /** Contador opcional à direita (ex.: notificações não lidas). */
  badge?: () => number;
};

export const NAV_ITEMS: NavItem[] = [
  { key: "home", label: "Início", icon: Home, tabRoute: "/(tabs)" },
  { key: "busca", label: "Buscar", icon: Search, tabRoute: "/busca" },
  { key: "colecao", label: "Coleção", icon: Heart, tabRoute: "/colecao" },
  { key: "noticias", label: "Notícias", icon: Newspaper, tabRoute: "/noticias" },
  { key: "series", label: "Séries", icon: Layers, moreRoute: "/mais/series" },
  { key: "troca", label: "Clube da Troca", icon: ArrowLeftRight, moreRoute: "/mais/troca" },
  { key: "estatisticas", label: "Estatísticas", icon: ChartColumn, moreRoute: "/mais/estatisticas" },
  {
    key: "notificacoes",
    label: "Notificações",
    icon: Bell,
    moreRoute: "/mais/notificacoes",
    badge: getUnreadNotificationsSnapshot,
  },
  { key: "perfil", label: "Perfil", icon: User, moreRoute: "/mais/perfil" },
];
