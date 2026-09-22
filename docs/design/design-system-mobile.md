# ToSave Mobile — Design System

> Versão 1.0 · Fase 1 (app do colecionador) · Autora: Designer UI/UX
> Requisitos: `docs/ESPECIFICACAO-MOBILE.md`. Este documento define **como** o app se parece e se comporta, nunca **o que** ele faz.
> Origem: **adaptação** de `docs/referencia-web/design-system.md` para Expo + NativeWind v4. Paleta, escalas, fontes, raios e voz são os mesmos. O que muda são as unidades (pt/dp), a elevação nativa, a safe area, os gestos e o mecanismo de tema.

Documentos irmãos: `componentes.md` (catálogo), `telas/` (specs por tela), `README.md` (mapa de navegação e decisões).

---

## 1. Princípios (iguais ao web, com leitura mobile)

1. **A miniatura é a protagonista.** A imagem ocupa 60–75% de qualquer card. Texto é legenda.
2. **Garagem à noite.** Superfícies escuras em camadas (asfalto → carroceria → vidro). Laranja é o "farol" da ação, vermelho é a "chama" da emoção (coleção, destaque, erro).
3. **Nunca um CRUD.** Hierarquia editorial: números grandes em Saira itálica, seções nomeadas, ações contextuais. Nada de listas cinzas com "Editar | Excluir".
4. **Polegar primeiro.** Ações primárias ficam na metade inferior da tela ou em barra fixa na base. Alvo de toque mínimo de **44 × 44 pt** sempre.
5. **Cor com parcimônia.** Laranja = ação primária e estado ativo. Amarelo = marca e números de coleção. Vermelho = coleção/favorito, destaque e erro. Os três juntos só no gradiente flame.
6. **Nativo, não web embrulhado.** Tab bar e stack nativos (expo-router), gestos de voltar do sistema, haptics discretos, bottom sheets arrastáveis, teclado que nunca cobre o campo.

---

## 2. Marca no app

| Arquivo (`_brand/`) | Destino no app | Uso |
|---|---|---|
| `logo.png` (644×241) | `assets/brand/logo.png` | Splash, onboarding, login, header da Home. Sempre sobre superfície ink. |
| `logo-light.png` (644×241) | `assets/brand/logo-light.png` | Tema light fora das superfícies ink (ex.: rodapé do Perfil). |
| `logo-car.png` (644×160) | `assets/brand/logo-car.png` | Loader de marca, marca d'água do EmptyState grande. |
| `favicon/icon-512.png` | `assets/icon.png` + `android.adaptiveIcon.foregroundImage` | Ícone do app. Fundo do adaptive icon: `#0B0B0D`. |

**`app.json` (trecho relevante):**
```json
{
  "expo": {
    "name": "ToSave",
    "scheme": "tosave",
    "userInterfaceStyle": "automatic",
    "icon": "./assets/icon.png",
    "backgroundColor": "#0B0B0D",
    "android": { "adaptiveIcon": { "foregroundImage": "./assets/icon.png", "backgroundColor": "#0B0B0D" } },
    "ios": { "infoPlist": { "LSApplicationQueriesSchemes": ["whatsapp"] } },
    "plugins": [
      ["expo-splash-screen", { "image": "./assets/brand/logo.png", "imageWidth": 220, "resizeMode": "contain", "backgroundColor": "#0B0B0D" }],
      "expo-font"
    ]
  }
}
```

**Regras da logo (herdadas de `marca.md`):**
- **Superfícies ink são sempre escuras, nos dois temas:** splash, onboarding, login, faixa superior da Home (logo + carrossel de séries) e TabBar. Nelas usa-se sempre `logo.png`.
- Tamanhos: **96 pt** de largura no header da Home, **180 pt** no login, **220 pt** no splash. Proporção fixa 644:241 (altura = largura × 0,374).
- Área de respiro: altura do "T" (≈ 12% da altura da logo) em todos os lados.
- Componente único `<Logo variant="auto|dark|light" size="sm|md|lg" />` (ver `componentes.md` §C.6).

**Gradiente flame** (assinatura, usar com parcimônia): `expo-linear-gradient` com
```ts
export const flameGradient = {
  colors: ["#FFDE21", "#FD8401", "#FF0000"] as const,
  locations: [0, 0.45, 1] as const,
  start: { x: 0, y: 0.4 }, end: { x: 1, y: 0.6 }, // ≈ 100deg do web
};
```
Usos permitidos: barra de progresso do splash, indicador do onboarding ativo, sublinhado da tab ativa no Header, arco do EmptyState, botão `flame` (só o CTA "Entrar" do login e o "Começar" do onboarding).

---

## 3. Cores

### 3.1 Paleta primitiva (idêntica ao web; 500 = cor exata da logo)

| Escala | 50 | 100 | 200 | 300 | 400 | **500** | 600 | 700 | 800 | 900 | 950 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **orange** (primary) | `#FFF5E6` | `#FFE7C2` | `#FFCF85` | `#FFB347` | `#FF9A1A` | **`#FD8401`** | `#E06E00` | `#B85600` | `#8F4300` | `#6B3200` | `#3D1C00` |
| **yellow** (accent) | `#FFFBE6` | `#FFF5BF` | `#FFEC80` | `#FFE54D` | `#FFE133` | **`#FFDE21`** | `#E6C200` | `#B39700` | `#806C00` | `#594B00` | — |
| **red** (flame) | `#FFF0F0` | `#FFD6D6` | `#FFA8A8` | `#FF6B6B` | `#FF3838` | **`#FF0000`** | `#E00000` | `#B30000` | `#800000` | `#4D0000` | — |

**neutral ("asphalt")**: 0 `#FFFFFF` · 50 `#F6F6F8` · 100 `#EBEBEF` · 200 `#D6D6DD` · 300 `#B4B4BE` · 400 `#8A8A96` · 500 `#5B5B66` · 600 `#3A3A43` · 700 `#26262D` · 800 `#1C1C21` · 850 `#16161A` · 900 `#111114` · 950 `#0B0B0D`.

### 3.2 Tokens semânticos

Componentes e telas **só** usam tokens semânticos (`bg-surface`, `text-fg-muted`, `bg-primary`). Primitivas apenas no gradiente e em casos documentados. Valores em canais RGB, para funcionar `bg-primary/20`.

| Token | Uso | Dark (padrão) | Light |
|---|---|---|---|
| `bg` | fundo das telas | `11 11 13` #0B0B0D | `246 246 248` #F6F6F8 |
| `surface` | cards, sheets, header de stack | `22 22 26` #16161A | `255 255 255` |
| `surface-2` | palco da imagem, inputs | `28 28 33` #1C1C21 | `240 240 243` #F0F0F3 |
| `surface-3` | pressed, chips, skeleton base | `38 38 45` #26262D | `235 235 239` #EBEBEF |
| `ink` | superfícies sempre-escuras (splash, login, TabBar, topo da Home) | `11 11 13` | `17 17 20` #111114 |
| `ink-fg` | texto sobre ink | `246 246 248` | `246 246 248` |
| `border` | contorno de card, divisórias | `38 38 45` | `224 224 230` #E0E0E6 |
| `border-strong` | inputs, chips outline | `58 58 67` | `200 200 208` #C8C8D0 |
| `fg` | texto principal | `246 246 248` | `17 17 20` |
| `fg-muted` | texto secundário | `180 180 190` | `75 75 85` #4B4B55 |
| `fg-subtle` | metadados, placeholder, ícone inativo | `138 138 150` | `110 110 122` #6E6E7A |
| `primary` | fundo de CTA, estado ativo | `253 132 1` | `253 132 1` |
| `primary-pressed` | CTA pressionado | `255 154 26` | `224 110 0` |
| `primary-fg` | texto sobre primary | `11 11 13` | `11 11 13` |
| `primary-text` | link, texto laranja | `255 154 26` | `184 86 0` |
| `primary-soft` | fundo tonal (chip ativo) | `61 28 0` | `255 231 194` |
| `accent` | número de coleção `#001`, contadores | `255 222 33` | `128 108 0` |
| `accent-soft` | fundo tonal amarelo | `89 75 0` | `255 245 191` |
| `flame` | coleção ativa (coração), destaque, repetido | `255 56 56` | `224 0 0` |
| `flame-soft` | fundo tonal vermelho | `77 0 0` | `255 240 240` |
| `success` | | `34 197 94` | `21 128 61` |
| `warning` | | `255 222 33` | `128 108 0` |
| `danger` | erro, remover | `255 56 56` | `224 0 0` |
| `info` | | `96 165 250` | `37 99 235` |
| `overlay` | backdrop de sheet e modal | `0 0 0` (usar /70) | `17 17 20` (usar /50) |

> Mobile não tem hover. O token web `primary-hover` vira **`primary-pressed`** (mesmos valores). `ring` (foco) não é necessário em toque; o foco de teclado externo e leitor de tela é tratado em §11.

**Contraste (WCAG AA, herdado e verificado no web):** texto `#0B0B0D` sobre laranja 7,9:1 ✅ (**texto branco sobre laranja é proibido**, 2,5:1). `fg-muted` sobre `surface` ≥ 7:1 nos dois temas. `fg-subtle` ≥ 4,5:1. `accent` dark 13:1; `accent` light usa yellow-800 (5,2:1). Texto amarelo sobre fundo claro com yellow-500..700 é proibido.

### 3.3 Temas

- **Padrão: dark.** O usuário escolhe no Perfil: **Escuro · Claro · Sistema** (SegmentedControl). Persistido em AsyncStorage (`tosave.theme`).
- **Ink independe do tema:** splash, onboarding e login são 100% ink. No restante do app, TabBar e o topo da Home são ink também no light (mesma decisão aprovada no web para navbar e hero).
- Status bar: `light` sobre ink e no dark; `dark` no light fora do ink. Controlada por tela com `<StatusBar style=… />` do `expo-status-bar`.

---

## 4. Implementação dos tokens no NativeWind v4

NativeWind v4 não lê `:root` do web em runtime de forma confiável para troca de tema manual, por isso o mecanismo é **`vars()` aplicado num `View` raiz**. Os valores ficam em TS e são a fonte única de verdade (className e JS).

### 4.1 `tailwind.config.js` (pronto para colar)

```js
/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: token("bg"),
        surface: { DEFAULT: token("surface"), 2: token("surface-2"), 3: token("surface-3") },
        ink: { DEFAULT: token("ink"), fg: token("ink-fg") },
        border: { DEFAULT: token("border"), strong: token("border-strong") },
        fg: { DEFAULT: token("fg"), muted: token("fg-muted"), subtle: token("fg-subtle") },
        primary: {
          DEFAULT: token("primary"), pressed: token("primary-pressed"), fg: token("primary-fg"),
          text: token("primary-text"), soft: token("primary-soft"),
        },
        accent: { DEFAULT: token("accent"), soft: token("accent-soft") },
        flame: { DEFAULT: token("flame"), soft: token("flame-soft") },
        success: token("success"),
        warning: token("warning"),
        danger: token("danger"),
        info: token("info"),
        overlay: token("overlay"),
        orange: {
          50: "#FFF5E6", 100: "#FFE7C2", 200: "#FFCF85", 300: "#FFB347", 400: "#FF9A1A",
          500: "#FD8401", 600: "#E06E00", 700: "#B85600", 800: "#8F4300", 900: "#6B3200", 950: "#3D1C00",
        },
        yellow: {
          50: "#FFFBE6", 100: "#FFF5BF", 200: "#FFEC80", 300: "#FFE54D", 400: "#FFE133",
          500: "#FFDE21", 600: "#E6C200", 700: "#B39700", 800: "#806C00", 900: "#594B00",
        },
        red: {
          50: "#FFF0F0", 100: "#FFD6D6", 200: "#FFA8A8", 300: "#FF6B6B", 400: "#FF3838",
          500: "#FF0000", 600: "#E00000", 700: "#B30000", 800: "#800000", 900: "#4D0000",
        },
        neutral: {
          0: "#FFFFFF", 50: "#F6F6F8", 100: "#EBEBEF", 200: "#D6D6DD", 300: "#B4B4BE", 400: "#8A8A96",
          500: "#5B5B66", 600: "#3A3A43", 700: "#26262D", 800: "#1C1C21", 850: "#16161A", 900: "#111114", 950: "#0B0B0D",
        },
      },
      fontFamily: {
        // RN não sintetiza peso: cada peso é uma família carregada via expo-font
        sans: ["Inter_400Regular"],
        "sans-medium": ["Inter_500Medium"],
        "sans-semibold": ["Inter_600SemiBold"],
        display: ["Saira_700Bold"],
        "display-semibold": ["Saira_600SemiBold"],
        "display-black": ["Saira_800ExtraBold_Italic"], // única variante itálica: números grandes e títulos de marca
        eyebrow: ["SairaCondensed_600SemiBold"],
        mono: ["JetBrainsMono_500Medium"],
      },
      fontSize: {
        // [size, { lineHeight, letterSpacing }] em pt; letterSpacing absoluto (RN não aceita em)
        "display-xl": ["40px", { lineHeight: "42px", letterSpacing: "-0.8px" }],
        "display-lg": ["32px", { lineHeight: "36px", letterSpacing: "-0.6px" }],
        "display-md": ["26px", { lineHeight: "30px", letterSpacing: "-0.3px" }],
        h1: ["24px", { lineHeight: "30px", letterSpacing: "-0.2px" }],
        h2: ["20px", { lineHeight: "26px" }],
        h3: ["17px", { lineHeight: "23px" }],
        "body-lg": ["17px", { lineHeight: "26px" }],
        body: ["15px", { lineHeight: "22px" }],
        "body-sm": ["13px", { lineHeight: "18px" }],
        caption: ["12px", { lineHeight: "16px", letterSpacing: "0.1px" }],
        eyebrow: ["11px", { lineHeight: "14px", letterSpacing: "1.5px" }],
        tab: ["11px", { lineHeight: "13px", letterSpacing: "0.2px" }],
      },
      spacing: { 4.5: "18px", 11: "44px", 13: "52px", 15: "60px", 18: "72px", 22: "88px" },
      borderRadius: { xs: "4px", sm: "6px", md: "8px", lg: "12px", xl: "16px", "2xl": "20px" },
      aspectRatio: { card: "4 / 3", hero: "16 / 10", gallery: "4 / 3" },
    },
  },
  plugins: [],
};
```

### 4.2 `src/theme/tokens.ts` — valores por tema

```ts
import { vars } from "nativewind";

export type Scheme = "dark" | "light";

export const palette = {
  dark: {
    bg: "11 11 13", surface: "22 22 26", "surface-2": "28 28 33", "surface-3": "38 38 45",
    ink: "11 11 13", "ink-fg": "246 246 248",
    border: "38 38 45", "border-strong": "58 58 67",
    fg: "246 246 248", "fg-muted": "180 180 190", "fg-subtle": "138 138 150",
    primary: "253 132 1", "primary-pressed": "255 154 26", "primary-fg": "11 11 13",
    "primary-text": "255 154 26", "primary-soft": "61 28 0",
    accent: "255 222 33", "accent-soft": "89 75 0",
    flame: "255 56 56", "flame-soft": "77 0 0",
    success: "34 197 94", warning: "255 222 33", danger: "255 56 56", info: "96 165 250",
    overlay: "0 0 0",
  },
  light: {
    bg: "246 246 248", surface: "255 255 255", "surface-2": "240 240 243", "surface-3": "235 235 239",
    ink: "17 17 20", "ink-fg": "246 246 248",
    border: "224 224 230", "border-strong": "200 200 208",
    fg: "17 17 20", "fg-muted": "75 75 85", "fg-subtle": "110 110 122",
    primary: "253 132 1", "primary-pressed": "224 110 0", "primary-fg": "11 11 13",
    "primary-text": "184 86 0", "primary-soft": "255 231 194",
    accent: "128 108 0", "accent-soft": "255 245 191",
    flame: "224 0 0", "flame-soft": "255 240 240",
    success: "21 128 61", warning: "128 108 0", danger: "224 0 0", info: "37 99 235",
    overlay: "17 17 20",
  },
} as const;

type TokenName = keyof typeof palette.dark;

/** Estilos com CSS variables para aplicar em um View (className usa rgb(var(--x))) */
export const themeVars = {
  dark: vars(Object.fromEntries(Object.entries(palette.dark).map(([k, v]) => [`--${k}`, v]))),
  light: vars(Object.fromEntries(Object.entries(palette.light).map(([k, v]) => [`--${k}`, v]))),
};

/** Cor em string para props que não aceitam className (ícones, tintColor, StatusBar, placeholderTextColor) */
export const color = (scheme: Scheme, name: TokenName, alpha = 1) =>
  `rgba(${palette[scheme][name].split(" ").join(", ")}, ${alpha})`;
```

### 4.3 Onde o tema é aplicado

- `ThemeProvider` (em `app/_layout.tsx`) resolve o esquema (preferência salva → "Sistema" usa `useColorScheme()` do RN) e:
  1. Renderiza `<View style={themeVars[scheme]} className="flex-1 bg-bg">` envolvendo o app inteiro.
  2. Chama `colorScheme.set(scheme)` do NativeWind para as variantes `dark:` funcionarem quando necessárias.
  3. Expõe `useTheme()` → `{ scheme, preference, setPreference, c: (token, alpha?) => string }`.
  4. Passa um tema para o `ThemeProvider` do React Navigation (fundo `bg`, card `surface`, texto `fg`, borda `border`, primary `primary`), evitando flash branco nas transições de stack.
- **`<ThemeScope scheme="dark">`**: reaplica `themeVars.dark` em um subárvore. Usado nas superfícies ink (TabBar, topo da Home, splash, onboarding, login) e **obrigatório dentro de todo `Modal` do RN e de todo portal de BottomSheet**, porque eles são montados fora da árvore do View raiz e perdem as variáveis. `componentes.md` já inclui isso em BottomSheet, Modal e GalleryViewer.

---

## 5. Tipografia

### 5.1 Famílias (via `expo-font` + `@expo-google-fonts/*`)

| Papel | Família e pesos | Pacote | Classe |
|---|---|---|---|
| Texto de UI e corpo | Inter 400, 500, 600 | `@expo-google-fonts/inter` | `font-sans`, `font-sans-medium`, `font-sans-semibold` |
| Títulos | Saira 600, 700 | `@expo-google-fonts/saira` | `font-display-semibold`, `font-display` |
| Números grandes e títulos de marca | Saira 800 itálico | `@expo-google-fonts/saira` | `font-display-black` |
| Eyebrow (MARCA · ANO) | Saira Condensed 600, CAIXA ALTA | `@expo-google-fonts/saira-condensed` | `font-eyebrow uppercase` |
| Códigos: toy, `#001`, `8/10`, `1/64` | JetBrains Mono 500 | `@expo-google-fonts/jetbrains-mono` | `font-mono` |

- As fontes carregam no `app/_layout.tsx` com `useFonts`. O splash nativo fica visível até elas carregarem (`SplashScreen.preventAutoHideAsync()`), sem texto em fonte de sistema piscando.
- **Não usar** `font-bold`, `font-semibold` do Tailwind em texto: em RN isso pede um peso sintético da família atual e dá resultado diferente em iOS e Android. O peso é sempre a família (`font-sans-semibold`).
- **Regra da identidade:** `font-display-black` (Saira 800 itálico) só em: números grandes (contadores da coleção e do perfil), título do detalhe do carro e títulos das telas ink (onboarding e login). Ecoa a inclinação do wordmark "TOSAVE".

### 5.2 Escala mobile

Web usava `clamp()`; no app os tamanhos são fixos em pt e o sistema escala por acessibilidade.

| Token | Tamanho / linha | Família padrão | Uso |
|---|---|---|---|
| `display-xl` | 40 / 42 | display-black | Contador grande do Perfil e da Coleção |
| `display-lg` | 32 / 36 | display-black | Título das telas ink (login, onboarding) |
| `display-md` | 26 / 30 | display-black | Título do carro no detalhe |
| `h1` | 24 / 30 | display | Título grande de tela (large title) |
| `h2` | 20 / 26 | display | Título de seção ("Séries em destaque") |
| `h3` | 17 / 23 | sans-semibold | Título de sheet, modal e card grande |
| `body-lg` | 17 / 26 | sans | Descrição do carro |
| `body` | 15 / 22 | sans | Padrão da UI, inputs, botões md |
| `body-sm` | 13 / 18 | sans | Metadados, título do CarCard em 2 colunas |
| `caption` | 12 / 16 | sans | Helper, erro de campo, contadores |
| `eyebrow` | 11 / 14 | eyebrow, caixa alta | "MATTEL · 2024" acima de títulos |
| `tab` | 11 / 13 | sans-medium | Label da TabBar |

### 5.3 Escala dinâmica (acessibilidade)

- `allowFontScaling` fica ligado (padrão). Limites por papel via prop `maxFontSizeMultiplier`:
  - corpo, body-sm, caption e inputs: **1.6**;
  - h1–h3: **1.4**;
  - display-*, tab e eyebrow: **1.2** (para não quebrar grid, TabBar e hero).
- O componente `<Text variant="…">` de `src/components/ui/Text.tsx` aplica família, tamanho, cor padrão e `maxFontSizeMultiplier` por variante. Telas nunca usam `<Text>` do RN direto.
- Com fonte grande (multiplicador > 1.3), o grid de carros cai de 2 para **1 coluna** abaixo de 400 pt de largura (§6.3).

---

## 6. Espaçamento, densidade e layout

### 6.1 Escala

Base 4 pt (escala do Tailwind). Tokens extras: `4.5` 18, `11` 44, `13` 52, `15` 60, `18` 72, `22` 88.

| Uso | Valor | Classe |
|---|---|---|
| Gutter lateral de tela | 16 pt (20 em ≥ 600 pt de largura) | `px-4` / `px-5` |
| Gap do grid de cards | 12 pt | `gap-3` |
| Padding interno de card | 12 pt | `p-3` |
| Padding de sheet e modal | 20 pt | `p-5` |
| Espaço entre label e campo | 6 pt | `mb-1.5` |
| Espaço entre campos de formulário | 16 pt | `gap-4` |
| Ritmo entre seções da tela | 32 pt | `mt-8` |
| Espaço entre título de seção e conteúdo | 12 pt | `mb-3` |

### 6.2 Densidade

- **Confortável por padrão**: o app é de navegação e contemplação, não de operação. Uma linha de lista tem no mínimo 56 pt; linha com thumbnail tem 72 pt.
- Cards "médios" (requisito): em celular de 360–430 pt, 2 colunas; o card fica entre 158 e 199 pt de largura, imagem 4:3 (119–149 pt de altura) e corpo de 76 pt. A imagem ocupa ~62% do card.
- Máximo de **uma** ação primária visível por tela.

### 6.3 Grid responsivo (FlashList / FlatList `numColumns`)

Colunas calculadas por `useWindowDimensions().width` (hook `useGridColumns()`):

| Largura da janela | Colunas | Gutter |
|---|---|---|
| < 360 pt, ou escala de fonte > 1.3 com < 400 pt | 1 (CarCard em modo `row`) | 16 |
| 360–599 pt (celulares) | 2 | 16 |
| 600–899 pt (tablet retrato, dobráveis) | 3 | 20 |
| ≥ 900 pt | 4 | 24 |

Orientação: o app é **retrato** (`"orientation": "portrait"` em celular). Em tablet, liberar paisagem com a mesma regra de colunas. O GalleryViewer permite paisagem em qualquer aparelho.

### 6.4 Alvo de toque — 44 pt

- **Todo elemento interativo tem área mínima de 44 × 44 pt** (`min-h-11 min-w-11`).
- Quando o visual precisa ser menor (FavoriteButton de 32 pt sobre o card, "×" de chip, stepper), a área cresce com `hitSlop` até 44 pt. Utilitário: `hitSlopFor(visualSize)` → `(44 - visualSize) / 2` em cada lado.
- Distância mínima de 8 pt entre dois alvos adjacentes (evita toque errado no grid e em stepper).
- Em Android, onde a recomendação do Material é 48 dp, a TabBar e os botões `lg` já têm ≥ 48.
- Feedback de toque sempre visível em até 100 ms: `Pressable` com estado `pressed` (escala e/ou superfície), e `android_ripple` onde há fundo sólido (`color: c("fg", 0.12)`).

### 6.5 Safe area

Provider: `react-native-safe-area-context` (`SafeAreaProvider` no root). Regras:

| Região | Regra |
|---|---|
| Topo | Telas com Header usam o inset superior dentro do Header (o fundo do Header pinta a área da status bar). Telas sem Header (splash, onboarding, login, Home e detalhe do carro, que têm imagem até o topo) aplicam `paddingTop: insets.top` no primeiro conteúdo interativo, **nunca** na imagem de fundo. |
| Base | A TabBar soma `insets.bottom` à sua altura (56 + inset). Barras de ação fixas (detalhe, filtros) usam `paddingBottom: max(insets.bottom, 12)`. |
| Laterais | Em paisagem (galeria, tablet), aplicar `insets.left/right` ao conteúdo, não ao fundo. |
| Teclado | `KeyboardAvoidingView` (iOS `padding`) ou `react-native-keyboard-controller`. Campo focado e botão principal sempre visíveis acima do teclado. |
| Scroll | Listas usam `contentContainerStyle={{ paddingBottom: tabBarHeight + 24 }}` para o último item não ficar atrás da TabBar (`useBottomTabBarHeight()`). |

Utilitários do NativeWind v4 (`pt-safe`, `pb-safe`, `pb-safe-offset-4`) podem ser usados em layouts simples; em Header, TabBar e barras fixas usar o hook `useSafeAreaInsets()` para somar valores com precisão.

### 6.6 Alturas fixas

| Elemento | Altura |
|---|---|
| Header de stack | 52 pt + inset superior |
| Header "large title" (Coleção, Perfil, Busca) | 52 pt de barra + 44 pt de título que colapsa ao rolar |
| TabBar | 56 pt + inset inferior |
| Barra de ação fixa (detalhe do carro, footer de sheet) | 72 pt + inset inferior |
| Botão md / lg | 44 / 52 pt |
| Input / SearchBar | 48 / 44 pt |
| Chip de filtro | 36 pt visual, 44 pt de toque |

---

## 7. Raio

Iguais ao web ("bordas levemente arredondadas").

| Token | Valor | Uso |
|---|---|---|
| `rounded-xs` | 4 | badges |
| `rounded-sm` | 6 | chips |
| `rounded-md` | 8 | botões, inputs, SearchBar, thumbs pequenas |
| `rounded-lg` | 12 | **cards**, imagens, cards de série |
| `rounded-xl` | 16 | modal, cantos superiores do BottomSheet |
| `rounded-full` | — | avatar, FavoriteButton, dots do carrossel |

Imagens dentro de card herdam o raio com `overflow-hidden` no container (no Android, `expo-image` precisa do `borderRadius` também na própria imagem quando não há container recortado).

---

## 8. Elevação e sombra (padrão nativo)

Sombra no RN não é CSS: iOS usa `shadowColor/Offset/Opacity/Radius`, Android usa `elevation`. Os tokens ficam em `src/theme/elevation.ts` e são aplicados via `style` (combinados com className). **No dark, elevação é luz, não sombra:** a superfície sobe de nível e ganha borda hairline; sombra preta sobre fundo preto é invisível e só custa desempenho.

| Nível | Uso | Dark | Light (iOS) | Light (Android) |
|---|---|---|---|---|
| `e0` | lista, fundo | `bg` sem borda | — | `elevation: 0` |
| `e1` | CarCard, card de série, input | `surface` + `border border-border` (1 px) | `shadowColor #111114, offset {0,1}, opacity .06, radius 2` + `border-border` | `elevation: 1` + borda |
| `e2` | Header ao rolar, barra de ação fixa, Toast | `surface` + borda superior/inferior `border` | `offset {0,4}, opacity .10, radius 12` | `elevation: 4` |
| `e3` | BottomSheet, Modal, menu | `surface` + borda `border-strong` no topo | `offset {0,-8}` (sheet) ou `{0,16}` (modal), opacity .20, radius 24 | `elevation: 12` |
| `glow` | CTA flame, FavoriteButton ativo | `shadowColor #FD8401` (ou `#FF3838` no favorito), `offset {0,0}`, opacity .45, radius 16 | igual, opacity .30 | `elevation: 6` + `shadowColor` (API 28+ colore a sombra; abaixo disso fica neutra, aceitável) |

```ts
// src/theme/elevation.ts
import { Platform, ViewStyle } from "react-native";
import type { Scheme } from "./tokens";

export function elevation(level: "e0" | "e1" | "e2" | "e3", scheme: Scheme): ViewStyle {
  if (scheme === "dark" || level === "e0") return {}; // dark: só surface + borda (className)
  const ios = {
    e1: { shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
    e2: { shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
    e3: { shadowOffset: { width: 0, height: 16 }, shadowOpacity: 0.2, shadowRadius: 24 },
  }[level];
  const android = { e1: 1, e2: 4, e3: 12 }[level];
  return Platform.select({
    ios: { shadowColor: "#111114", ...ios },
    default: { elevation: android, shadowColor: "#111114" },
  })!;
}

export function glow(color = "#FD8401"): ViewStyle {
  return Platform.select({
    ios: { shadowColor: color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.45, shadowRadius: 16 },
    default: { elevation: 6, shadowColor: color },
  })!;
}
```

**Regras de desempenho:** sombra iOS exige fundo opaco no mesmo View (`bg-surface`); nunca aplicar sombra em itens de lista no dark; em Android, `elevation` em item de lista com `overflow-hidden` e imagem pode serrilhar cantos, por isso o CarCard no light usa `e1` com borda e sem aumentar a elevação ao pressionar.

**Vidro (glass):** sobre imagens (badges, FavoriteButton, controles da galeria) usar `bg-black/45` simples. `expo-blur` (`BlurView intensity 40 tint="dark"`) apenas na TabBar e no Header translúcido do detalhe. No Android, `BlurView` tem custo alto: usar `experimentalBlurMethod="dimezisBlurView"` só na TabBar; no restante, fallback `bg-ink/90`.

---

## 9. Movimento

Biblioteca: `react-native-reanimated` (v3+). Tudo roda na UI thread.

### 9.1 Tokens

| Token | Valor | Uso |
|---|---|---|
| `duration.fast` | 120 ms | press, troca de cor |
| `duration.base` | 200 ms | troca de tab, chip, fade de conteúdo |
| `duration.slow` | 320 ms | modal, sheet, entrada de tela, crossfade de imagem |
| `easing.out` | `Easing.bezier(0.22, 1, 0.36, 1)` (out-expo) | entradas |
| `easing.inOut` | `Easing.bezier(0.65, 0, 0.35, 1)` | transições de layout |
| `spring.snappy` | `{ damping: 18, stiffness: 260, mass: 1 }` | press, pop do coração |
| `spring.sheet` | `{ damping: 24, stiffness: 220 }` | BottomSheet, soltar da galeria |

```ts
// src/theme/motion.ts
import { Easing } from "react-native-reanimated";
export const duration = { fast: 120, base: 200, slow: 320 } as const;
export const easing = { out: Easing.bezier(0.22, 1, 0.36, 1), inOut: Easing.bezier(0.65, 0, 0.35, 1) };
export const spring = { snappy: { damping: 18, stiffness: 260, mass: 1 }, sheet: { damping: 24, stiffness: 220 } };
```

### 9.2 Coreografia

| Momento | Animação |
|---|---|
| Press em botão e card | escala 1 → 0.97 (card 0.98) com `spring.snappy`; volta ao soltar |
| Navegação de stack | nativa do expo-router (`animation: "default"`: slide no iOS, fade-from-bottom no Android). Detalhe do carro: `"slide_from_right"` nas duas plataformas para consistência |
| Imagem do CarCard → detalhe | fade + escala 0.96 → 1 do hero (320 ms). Shared element fica fora da fase 1 (API instável) |
| Adicionar à coleção (coração) | escala 1 → 1.25 → 1 (280 ms, `spring.snappy`) + glow vermelho + haptic `impactLight` |
| Stepper de quantidade | número faz slide vertical de 8 pt (entra de baixo ao somar, de cima ao subtrair) + haptic `selection` |
| Troca de tab | ícone ativo faz escala 0.9 → 1 (200 ms); conteúdo sem animação (padrão nativo) |
| Lista carregando → conteúdo | skeleton faz crossfade de 200 ms para o conteúdo; itens da primeira página entram com `FadeInDown.duration(320).delay(i * 30)` até o 8º item, depois sem delay |
| Skeleton | pulso de opacidade 0.5 ↔ 1 em 1.4 s (mais barato que shimmer com gradiente em lista) |
| BottomSheet / Modal | sheet com `spring.sheet`; backdrop faz fade 0 → 0.7 em 200 ms |
| Toast | entra de cima (−16 pt → 0) + fade 200 ms; sai com fade 200 ms |
| Splash → app | ver `telas/01-onboarding-splash.md` |

### 9.3 Haptics (`expo-haptics`)

| Evento | Haptic |
|---|---|
| Adicionar à coleção | `impactAsync(Light)` |
| Remover da coleção (confirmado) | `notificationAsync(Warning)` |
| Stepper +/−, seleção de chip | `selectionAsync()` |
| Erro de login ou de ação | `notificationAsync(Error)` |
| Pull-to-refresh disparado | `impactAsync(Light)` |

Nunca haptic em rolagem, troca de tab ou abertura de tela.

### 9.4 Movimento reduzido

`useReducedMotion()` do Reanimated (ou `AccessibilityInfo.isReduceMotionEnabled`) → remove escalas, pop, slide do stepper, stagger de lista, autoplay do carrossel e pulso do skeleton (fica estático em opacidade 0.7). Mantém apenas fades de até 200 ms. Haptics continuam.

---

## 10. Iconografia e imagem

- **`lucide-react-native`** (requer `react-native-svg`), `strokeWidth 1.75`. Tamanhos: 16 inline, 20 padrão, 24 TabBar e Header. Cor via prop `color={c("fg-muted")}`, porque ícone SVG não herda className de cor.
- Ícones-chave: `Home`, `Search`, `Heart` (coleção), `User`, `SlidersHorizontal`, `X`, `ChevronLeft`, `ChevronRight`, `Share2`, `Car`, `Layers` (séries), `Tag` (marcas), `Sparkles` (atributos), `Hash` (collector), `Calendar` (ano), `Palette` (cor), `Ruler` (escala), `Minus`, `Plus`, `LogOut`, `Moon`, `Sun`, `Smartphone` (tema Sistema), `WifiOff`, `AlertCircle`, `RotateCw`, `Eye`, `EyeOff`, `Mail`, `Lock`, `Copy`.
- WhatsApp: SVG próprio monocromático em `src/components/ui/icons/WhatsAppIcon.tsx` (`fill={color}`), 20 pt.
- **Imagens:** sempre `expo-image` (cache em disco, `transition={200}`, `contentFit="cover"` padrão, `placeholder` com a cor `surface-2`). `imagemThumb` em cards e thumbs, `imagemFull` e `CarImage.path` na galeria. `recyclingKey={car.id}` em listas.
- **Palco da imagem** (`CarStage`): fundo `surface-2` + `LinearGradient` radial simulado (topo `rgba(255,255,255,.04)` → base transparente no dark; `rgba(17,17,20,.03)` no light). Dá a sensação de estúdio mesmo com foto de fundo branco.
- **Sem imagem ou erro ao carregar:** ícone `Car` 40 pt em `fg-subtle` com 40% de opacidade, centralizado no palco. Nunca um retângulo vazio.

---

## 11. Estados de interação (regras globais)

| Estado | Regra |
|---|---|
| **Pressed** | escala 0.97 + superfície sobe um nível (`surface` → `surface-3`) ou `primary` → `primary-pressed`. Ripple no Android em botões sólidos. |
| **Disabled** | `opacity-40`, `accessibilityState={{ disabled: true }}`, sem feedback de toque. |
| **Loading (botão)** | `ActivityIndicator` (cor do texto) no lugar do ícone esquerdo, label mantida, largura travada, `accessibilityState={{ busy: true }}`, toques ignorados. |
| **Selecionado** | `bg-primary-soft border-primary/60`, texto `text-primary-text`, `accessibilityState={{ selected: true }}`. |
| **Erro de campo** | borda `danger`, ícone `AlertCircle` à direita, mensagem `caption text-danger` abaixo; `accessibilityHint` com a mensagem e anúncio via `AccessibilityInfo.announceForAccessibility`. |
| **Foco (teclado externo, TV, leitor de tela)** | borda `primary` 2 pt no elemento focado (inputs já mudam a borda no foco). |
| **Sucesso** | Toast com borda esquerda `success`. Nunca bloqueia o fluxo. |
| **Offline** | Faixa `bg-surface-3` de 32 pt abaixo do Header com `WifiOff` + "Você está offline." (só a partir da fase 2, quando houver rede; na fase 1 o service não falha por rede, mas os estados de erro existem e são exercitáveis, ver §12). |

**Toasts:** topo, abaixo da status bar (`insets.top + 8`), 4 s, máximo 1 visível (novo substitui o anterior), arrastar para cima fecha.

### 11.1 Acessibilidade (obrigatório em todo componente)

- `accessibilityRole` correto (`button`, `link`, `header`, `image`, `search`, `tab`, `switch`, `adjustable` no stepper).
- `accessibilityLabel` em todo IconButton e em todo CarCard ("'71 Datsun 510 Wagon, Mattel, 2024, número 001").
- Ordem de leitura = ordem visual. Imagem decorativa: `accessible={false}`.
- Contraste da §3.2 vale para os dois temas.
- Leitor de tela: sheets e modais usam `accessibilityViewIsModal` (iOS) e `importantForAccessibility="no-hide-descendants"` no fundo (Android).

---

## 12. Estados de tela (padrão para todas as specs)

Toda tela que carrega dados implementa **quatro estados**, na mesma geometria para evitar salto de layout:

| Estado | Quando | Visual |
|---|---|---|
| **Carregando** | primeira carga, se passar de 150 ms | Skeleton com a geometria do conteúdo real (`componentes.md` §11). Nunca spinner de tela cheia. |
| **Conteúdo** | dados chegaram | Conteúdo. Pull-to-refresh (`RefreshControl`, `tintColor` = primary) em listas. |
| **Vazio** | lista vazia | `EmptyState` com texto **oficial**: sem carros → **"Nenhuma miniatura disponível no momento."**; sem outros conteúdos (séries, marcas, atributos, opções de filtro, anos) → **"Nenhum conteúdo disponível."** |
| **Erro** | service rejeitou | `ErrorState`: ícone `AlertCircle` em círculo `flame-soft`, título "Não foi possível carregar.", linha "Verifique sua conexão e tente novamente.", botão `secondary` "Tentar novamente" (`RotateCw`). Se já havia conteúdo (refresh falhou), mantém o conteúdo e mostra Toast de erro. |

Para a fase 1 exercitar os estados sem backend: os services aceitam, **só em `__DEV__`**, um simulador em `src/services/_dev.ts` (`setMockMode("ok" | "empty" | "error" | "slow")`) acessível por um toque longo de 2 s no avatar do Perfil. É infraestrutura de mockup, não aparece em produção.

---

## 13. Voz e microcopy

- Português do Brasil, segunda pessoa informal ("sua coleção"), frases curtas, sem ponto de exclamação em erros.
- Botões com verbo: "Entrar", "Adicionar à coleção", "Compartilhar", "Ver resultados", "Tentar novamente".
- Números de coleção sempre com `#` e zeros preservados: `#001`. Posição na série `8/10` e escala `1/64` em `font-mono`.
- **Empty states oficiais (texto exato, não alterar):**
  - Sem carros: **"Nenhuma miniatura disponível no momento."**
  - Sem conteúdos: **"Nenhum conteúdo disponível."**
- Busca/filtro sem resultado: título oficial de carros + linha auxiliar **"Tente outro termo ou limpe os filtros."** (decisão já aprovada no web).

---

## 14. Dependências de UI (para o Forja)

| Pacote | Para quê |
|---|---|
| `nativewind` v4 + `tailwindcss` 3.4 | estilos |
| `expo-router` | navegação (Stack + Tabs) |
| `react-native-safe-area-context`, `react-native-screens` | safe area e telas nativas |
| `react-native-reanimated`, `react-native-gesture-handler` | motion, gestos da galeria e sheet |
| `@gorhom/bottom-sheet` v5 | BottomSheet |
| `expo-image` | imagens com cache |
| `expo-linear-gradient` | gradiente flame e palco |
| `expo-blur` | TabBar e Header translúcidos |
| `expo-haptics` | haptics |
| `expo-font` + `@expo-google-fonts/inter`, `/saira`, `/saira-condensed`, `/jetbrains-mono` | tipografia |
| `expo-splash-screen`, `expo-status-bar`, `expo-system-ui` | splash, status bar, cor de fundo da janela |
| `lucide-react-native` + `react-native-svg` | ícones |
| `@react-native-async-storage/async-storage` | tema, onboarding visto, sessão simulada |
| `@shopify/flash-list` | grids longos (Home, Busca, Coleção) |

Instalar sempre com `npx expo install` para casar as versões do SDK.

---

## 15. Decisões desta adaptação e pendências

| # | Tema | Decisão |
|---|---|---|
| M1 | Troca de tema | `vars()` do NativeWind em View raiz + `ThemeScope` em portais. Tokens em TS, fonte única para className e JS. |
| M2 | Ink no light | Splash, onboarding, login, TabBar e topo da Home são sempre ink (continuidade da decisão 8 do web). |
| M3 | Hover | Não existe no app. `primary-hover` do web vira `primary-pressed`. |
| M4 | Sombra no dark | Não usar. Elevação = superfície mais clara + borda. |
| M5 | Coleção = favorito | O coração do CarCard e do detalhe adiciona/remove da coleção (mesmo conceito "like/favorito" do portal). Quantidade se ajusta no detalhe e na Coleção. |
| M6 | Acesso (**aprovado pelo Orquestrador**) | Navegação anônima: Home, Busca e detalhe do carro são públicos, como a home pública do portal. O login (modal) é pedido só ao adicionar à coleção e ao abrir as tabs Coleção ou Perfil. Ver `telas/02-login.md` §1. |
| M7 | Grid | 2 colunas em celular, 1 com fonte muito grande, 3–4 em tablet. |

**Pendências para o Orquestrador:**
1. Enquadramento de imagem (`cover` vs `contain`) segue pendente do web: padrão `cover`, revisar com fotos reais.
2. Compartilhar via WhatsApp na fase 1 envia só texto (não há URL pública do carro). Na fase 2, incluir o link do portal.
