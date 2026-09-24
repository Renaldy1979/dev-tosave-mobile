import type { Href } from "expo-router";
import { Heart, Home, Search, User, type LucideIcon } from "lucide-react-native";

/**
 * Itens do menu lateral (`docs/design/telas/09-menu-drawer.md` §2.3 e
 * §2.5). Lista única: uma tela nova entra no menu com a rota em
 * `app/(drawer)/` + 1 linha aqui; o drawer e o header não mudam.
 *
 * Só entra item de tela que existe e funciona (sem "Em breve", sem
 * item desabilitado). Ordem por frequência de uso.
 */
export type DrawerItem = {
  /** Nome da rota dentro de `app/(drawer)/` (ex.: `index`, `busca`). */
  name: string;
  route: Href;
  label: string;
  icon: LucideIcon;
  /** Com mais de 6 itens, o menu agrupa por seção (§2.5 regra 4). */
  section?: "principal" | "comunidade" | "conta";
  /** Contador opcional à direita (ex.: notificações não lidas). */
  badge?: () => number;
};

export const DRAWER_ITEMS: DrawerItem[] = [
  { name: "index", route: "/(drawer)", label: "Início", icon: Home },
  { name: "busca", route: "/busca", label: "Buscar", icon: Search },
  { name: "colecao", route: "/colecao", label: "Minha coleção", icon: Heart },
  { name: "perfil", route: "/perfil", label: "Perfil", icon: User },
];
