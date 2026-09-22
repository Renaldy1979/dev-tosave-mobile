# ToSave Mobile — Componentes

> Tokens, tipografia, elevação e motion: `design-system-mobile.md`. Equivalente web: `docs/referencia-web/componentes.md` (mesma linguagem visual).
> Caminho: `src/components/ui/` (primitivos) e `src/components/car/` (componentes de domínio: CarCard, GalleryViewer, FavoriteButton, ShareWhatsAppButton).

## Convenções

- TypeScript estrito. Todo componente aceita `className?: string` (mesclado por último) e repassa `testID`.
- Variantes com um mapa `const variants = { primary: "…", … } as const` + `cn()` (`clsx` + `tailwind-merge`). Não usar `cva` se não estiver instalado; o mapa simples basta.
- Toque sempre com `Pressable` (nunca `TouchableOpacity`), com animação de press via Reanimated (`usePressScale()`: 1 → 0.97, `spring.snappy`).
- Cor de ícone vem de `useTheme().c(token)`, porque SVG não herda className.
- Todo interativo: área ≥ 44 × 44 pt (`min-h-11` ou `hitSlop`), `accessibilityRole`, `accessibilityLabel` quando não houver texto visível, `accessibilityState` refletindo disabled/selected/busy/checked.
- Texto sempre por `<Text variant>` (§C.1), nunca `Text` do RN direto.
- Nenhum componente importa de `src/mocks/`. Dados chegam por props.

Índice: [1 Button](#1-button) · [2 Input](#2-input) · [3 SearchBar](#3-searchbar) · [4 CarCard](#4-carcard) · [5 Badge](#5-badge) · [6 TabBar](#6-tabbar) · [7 Header](#7-header) · [8 BottomSheet](#8-bottomsheet) · [9 Modal](#9-modal) · [10 EmptyState](#10-emptystate) · [11 Skeleton](#11-skeleton) · [12 FilterChips](#12-filterchips) · [13 FavoriteButton](#13-favoritebutton) · [14 ShareWhatsAppButton](#14-sharewhatsappbutton) · [15 GalleryViewer](#15-galleryviewer) · [C Complementares](#c-complementares)

---

## 1. Button

```ts
type ButtonProps = {
  label: string;
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "flame";
  size?: "sm" | "md" | "lg";
  leftIcon?: LucideIcon; rightIcon?: LucideIcon;
  loading?: boolean; disabled?: boolean; fullWidth?: boolean;
  onPress: () => void;
  className?: string; testID?: string;
};
```

Base: `flex-row items-center justify-center gap-2 rounded-md` + press scale.

| Variante | Classes (repouso → pressed) | Texto | Quando |
|---|---|---|---|
| `primary` | `bg-primary` → `bg-primary-pressed` | `text-primary-fg font-sans-semibold` | Uma por tela: "Adicionar à coleção", "Ver resultados", "Salvar" |
| `secondary` | `bg-surface-3` → `bg-border-strong` | `text-fg font-sans-medium` | Ação paralela: "Compartilhar", "Tentar novamente" |
| `outline` | `border border-border-strong` → `border-primary bg-primary-soft/40` | `text-fg` | "Ver tudo", "Limpar filtros" |
| `ghost` | transparente → `bg-surface-3` | `text-fg-muted` | Terciárias: "Pular", "Cancelar" |
| `danger` | `bg-danger` → `bg-danger/85` | `text-white font-sans-semibold` | Só confirmação destrutiva ("Remover") |
| `flame` | `LinearGradient` flame (§2 do DS) + `glow()`; pressed: opacidade 0.9 | `text-primary-fg font-sans-semibold` | **Apenas** "Entrar" (login) e "Começar" (onboarding) |

| Tamanho | Altura | Padding | Texto | Ícone |
|---|---|---|---|---|
| `sm` | 36 pt (+ hitSlop 4 → 44) | `px-3` | `body-sm` | 16 |
| `md` | 44 pt | `px-4` | `body` | 18 |
| `lg` | 52 pt | `px-6` | `body-lg` | 20 |

**Estados:** pressed · disabled (`opacity-40`) · loading (`ActivityIndicator` na cor do texto no lugar do `leftIcon`, label mantida, largura travada com `minWidth` medido em `onLayout`, `accessibilityState.busy`, toques ignorados).
**A11y:** `accessibilityRole="button"`, label = `label`.
**Regra mobile:** ações principais de formulário e barras fixas são `fullWidth`. Em par, a primária fica à direita (lado do polegar) na horizontal e em cima na vertical.

### 1.1 IconButton (suporte)

Botão só de ícone, `accessibilityLabel` obrigatório.
- Variantes: `ghost` (padrão; pressed `bg-surface-3`), `secondary` (`bg-surface-3`), `glass` (`bg-black/45`, ícone branco; sobre imagem).
- Tamanhos visuais: `sm` 32 (ícone 16, hitSlop 6), `md` 40 (ícone 20, hitSlop 2), `lg` 44 (ícone 22).
- Formato `rounded-md`; `rounded-full` quando `glass`.

---

## 2. Input

```ts
type InputProps = {
  label: string; hint?: string; error?: string;
  leftIcon?: LucideIcon; rightSlot?: ReactNode;
  variant?: "default" | "password" | "mono";
} & Omit<TextInputProps, "style">;
```

- Estrutura vertical: label (`body-sm font-sans-medium text-fg`, `mb-1.5`) → campo → hint ou erro (`caption`, `mt-1.5`).
- Campo: `h-12 rounded-md bg-surface-2 border border-border-strong px-3.5`, texto `body text-fg`, `placeholderTextColor={c("fg-subtle")}`, `selectionColor={c("primary")}`, `cursorColor` (Android) = primary.
- Com `leftIcon`: ícone 18 `fg-subtle` a 14 pt da borda, texto com `pl-10`.
- Sobre ink (login): usa as mesmas classes dentro de `ThemeScope dark`.

| Estado | Visual |
|---|---|
| Default | borda `border-strong` |
| Focado | borda `primary` 1.5 pt + anel externo `primary/15` de 3 pt (View absoluta, sem layout shift) |
| Erro | borda `danger`, `AlertCircle` 18 `danger` à direita, erro `text-danger`; anuncia a mensagem |
| Disabled | `opacity-50 bg-surface-3`, `editable={false}` |

**Variantes**
- `password`: `secureTextEntry`, `rightSlot` = IconButton `Eye`/`EyeOff` ("Mostrar senha" / "Ocultar senha"), `autoComplete="password"`, `textContentType="password"`.
- `mono`: `font-mono`, `autoCapitalize="characters"`, `keyboardType="default"` (preserva zeros à esquerda; nunca `numeric`).

**Teclado:** todo formulário define `returnKeyType` ("next" → próximo campo via ref; "go"/"done" no último), `autoCapitalize`, `autoComplete`, `inputMode` corretos. Email: `keyboardType="email-address"`, `autoCapitalize="none"`, `autoComplete="email"`, `textContentType="username"`.

---

## 3. SearchBar

```ts
type SearchBarProps = {
  value: string; onChangeText: (t: string) => void;
  onSubmit?: () => void;
  placeholder?: string;           // padrão: "Buscar por nome ou código"
  mode?: "input" | "trigger";     // trigger: não editável, só navega
  onPressTrigger?: () => void;
  autoFocus?: boolean;
  rightAction?: ReactNode;        // ex.: botão de filtros
  surface?: "default" | "ink";
};
```

- Container: `h-11 flex-row items-center rounded-md bg-surface-2 border border-border px-3 gap-2`. Sobre ink: `bg-white/10 border-white/10`, texto `ink-fg`.
- Esquerda: `Search` 18 `fg-subtle`. Direita, quando há valor: IconButton `X` sm ("Limpar busca"). Depois, `rightAction` opcional.
- `returnKeyType="search"`, `autoCorrect={false}`, `autoCapitalize="none"`, `clearButtonMode="never"` (usamos o nosso).
- Debounce de **300 ms** no `onChangeText` para buscar ao vivo (o hook `useDebouncedValue` fica na tela, não no componente).
- `mode="trigger"` (Home): mesmo visual, `Pressable` com `accessibilityRole="search"` e label "Buscar miniaturas"; ao tocar navega para a aba Buscar com o campo focado.
- Focado: borda `primary`. Botão "Cancelar" (`ghost sm`) aparece à direita no iOS enquanto focado (padrão nativo); no Android o voltar do sistema desfoca.

---

## 4. CarCard

Componente mais importante do app. **Imagem domina, texto é legenda.**

```ts
type CarCardProps = {
  car: {
    id: string; title: string; imagemThumb?: string | null;
    collector: string; seriePosition?: string | null; year: number; toy: string;
    brandName?: string; serieTitle?: string;
  };
  variant?: "grid" | "collection" | "row";
  inCollection?: boolean;          // grid: estado do FavoriteButton
  quantity?: number;               // collection
  onPress: () => void;
  onToggleCollection?: () => void; // grid
  onChangeQuantity?: (next: number) => void; // collection
};
```

### Anatomia `grid` (2 colunas)

```
┌─────────────────────────┐
│ #001                 ♡  │ ← Badge accent mono (collector) · FavoriteButton glass 32 (toque 44)
│                         │
│     [ IMAGEM 4:3 ]      │ ← CarStage + expo-image cover, cantos sup. rounded-lg
│                   8/10  │ ← Badge glass mono (seriePosition), se houver
├─────────────────────────┤
│ MATTEL · 2024           │ ← eyebrow fg-subtle (marca · ano)
│ '71 Datsun 510 Wagon    │ ← body-sm font-sans-semibold fg, 2 linhas reservadas
│ HW J-Imports            │ ← caption fg-muted, 1 linha (série)
└─────────────────────────┘
```

- Container: `Pressable` `rounded-lg bg-surface border border-border overflow-hidden` + `elevation("e1")` no light. Press: escala 0.98 e `bg-surface-3` no corpo.
- Corpo: `p-3 gap-0.5`, altura fixa de 76 pt (título sempre reserva 2 linhas com `numberOfLines={2}` + `minHeight`) para o grid alinhar.
- Imagem: `aspect-card`, `expo-image` com `recyclingKey={car.id}`, `transition={200}`, placeholder `Car` (DS §10) sem imagem ou em erro.
- Badges sobre a imagem a 8 pt das bordas.
- A área clicável é o card inteiro (`accessibilityRole="button"`, `accessibilityHint="Abre os detalhes"`). O FavoriteButton é um `Pressable` irmão, posicionado em absoluto, fora do Pressable do card, para o toque não propagar.
- Label de acessibilidade: `${title}, ${brandName}, ${year}, número ${collector}` + ", na sua coleção" quando `inCollection`.

### Variantes

| Variante | Diferença |
|---|---|
| `grid` | Como acima. Usado na Home e na Busca. |
| `collection` | Troca o FavoriteButton por **QuantityStepper glass** compacto (`− 2 +`) no canto superior direito. Se `quantity > 1`, Badge `flame` "Repetido ×2" substitui a linha da série. Subtrair a última unidade abre ConfirmDialog "Remover da coleção?". |
| `row` | Linha horizontal de 88 pt: thumb 96×72 `rounded-md` à esquerda + eyebrow, título (2 linhas) e `toy` em mono à direita + FavoriteButton. Usado com fonte muito grande (1 coluna), em "Mais da série" do detalhe e em resultados de busca por código toy. |

### Estados
| Estado | Visual |
|---|---|
| Carregando | `CarCardSkeleton` (mesma geometria) |
| Sem imagem / erro | palco com `Car` 40 pt `fg-subtle/40` |
| Pressed | escala 0.98 |
| Atualizando coleção | FavoriteButton/Stepper já mostra o novo valor (otimista), ver §13 |

**Desempenho:** `React.memo` com comparação por `car.id`, `inCollection` e `quantity`. Em FlashList, `estimatedItemSize` = largura da coluna × 0,75 + 76.

---

## 5. Badge

`flex-row items-center gap-1 self-start rounded-xs px-2 h-6` + texto `caption font-sans-medium`.

| Variante | Classes | Uso |
|---|---|---|
| `neutral` | `bg-surface-3` · `text-fg-muted` | ano, escala, atributo |
| `primary` | `bg-primary-soft` · `text-primary-text` | série, filtro ativo |
| `accent` | `bg-accent-soft` · `text-accent font-mono` | número de coleção `#001` |
| `flame` | `bg-flame-soft` · `text-flame` | "Em destaque" (série `isDefault`), "Repetido ×2" |
| `glass` | `bg-black/50` · `text-white` | sobre imagem (`#001`, `8/10`) |
| `outline` | `border border-border` · `text-fg-muted` | contagem |
| `count` | círculo `min-w-[18px] h-[18px] rounded-full bg-primary` · `text-primary-fg text-[11px] font-sans-semibold` | contador de filtros ativos sobre ícone |

Tamanhos: `sm` (h-5, texto 11) e `md` (h-6). Opcional `icon` (14) ou `dot` (6 pt).
**ColorBadge** (cor do carro): dot 10 pt com o hex (borda `border-strong` hairline) + nome. Se `color` não for hex válido, mostra ícone `Palette` + texto.
Badges não são interativos (`accessible` agrupado com o pai).

---

## 6. TabBar

Custom `tabBar` do `<Tabs>` do expo-router (`app/(tabs)/_layout.tsx`). **Sempre ink** nos dois temas.

```
┌───────────────────────────────────────────┐
│   ⌂        🔍        ♥ 12       👤         │ ← ícone 24 + label tab
│ Início   Buscar   Coleção    Perfil        │
└───────────────────────────────────────────┘  + inset inferior
```

- Container: `ThemeScope dark` → `BlurView intensity 40 tint="dark"` com `bg-ink/85` por cima (fallback Android: `bg-ink/95` sem blur), `border-t border-white/5`, altura 56 + `insets.bottom`, posição absoluta na base (o conteúdo rola por baixo).
- 4 itens, cada um `flex-1 items-center justify-center gap-1 min-h-12`:

| Rota | Label | Ícone inativo → ativo |
|---|---|---|
| `(tabs)/index` | Início | `Home` contorno → `Home` com `fill` primary/20 |
| `(tabs)/busca` | Buscar | `Search` → `Search` strokeWidth 2.25 |
| `(tabs)/colecao` | Coleção | `Heart` contorno → `Heart` preenchido |
| `(tabs)/perfil` | Perfil | `User` contorno → `User` com `fill` primary/20. **Sem sessão:** label "Entrar" e ícone `LogIn` |

- Ativo: ícone e label `primary` (`#FD8401`); indicador de 16×2 pt com gradiente flame acima do ícone. Inativo: `fg-subtle` (neutral-400).
- Coleção mostra um contador `Badge count` com o total de itens (soma de quantity), máximo "99+". Some quando zero e sem sessão.
- **Sem sessão:** tocar em Coleção ou em Entrar não troca de tab; abre o login em modal (`useRequireSession({ next })`, ver `telas/02-login.md` §1). A tab ativa continua a mesma.
- Toque: `selectionAsync` **não** (tab não tem haptic). Tocar na tab ativa rola a lista ao topo (`useScrollToTop`); tocar de novo na Busca foca o campo.
- A11y: `accessibilityRole="tab"`, `accessibilityState.selected`, label "Coleção, 12 itens".
- Esconde com o teclado aberto no Android (`tabBarHideOnKeyboard: true`).

---

## 7. Header

Header custom (`header` do Stack/Tabs ou componente na tela), três variantes:

```ts
type HeaderProps = {
  variant: "stack" | "large" | "transparent";
  title?: string;
  subtitle?: string;          // large: ex. "12 miniaturas"
  back?: boolean;             // padrão true em stack/transparent
  right?: ReactNode;          // até 2 IconButtons
  scrollY?: SharedValue<number>; // para large e transparent reagirem à rolagem
};
```

| Variante | Visual | Onde |
|---|---|---|
| `stack` | `bg-surface` + `border-b border-border` (dark) ou `elevation("e2")` (light), altura 52 + inset. Voltar (`ChevronLeft` 24, IconButton md, label "Voltar") à esquerda, título `h3` centralizado (iOS) ou alinhado à esquerda após o voltar (Android), ações à direita. | Telas de stack sem imagem |
| `large` | Barra de 52 pt transparente sobre `bg`; abaixo, título `h1 font-display` + `subtitle` `body-sm fg-muted`. Ao rolar 44 pt, o título grande faz fade/slide e o título pequeno `h3` aparece centralizado na barra, que ganha `bg-surface/95` + borda. | Busca, Coleção, Perfil |
| `transparent` | Sobre imagem: IconButtons `glass` (voltar e, opcionalmente, até 2 ações em `right`). Ao rolar além da altura do hero − 52, o fundo faz fade para `surface` com blur, os botões viram `ghost` e o título `h3` aparece. | Detalhe do carro |

- O fundo pinta a área da status bar (inset superior incluído no Header).
- Voltar: `router.back()`; se não houver histórico (deep link), `router.replace("/(tabs)")`.
- Gesto de voltar nativo (swipe da borda no iOS, back do Android) sempre ativo.

**HomeHeader** (específico da Home, ink): logo 96 pt à esquerda; à direita, Avatar 32 que leva ao Perfil ou, sem sessão, `Button ghost sm` "Entrar" (texto `ink-fg`) que abre o login em modal. Sem sino de notificações (fora da fase 1). Ver `telas/03-home.md`.

---

## 8. BottomSheet

Base: `@gorhom/bottom-sheet` v5 (`BottomSheetModal`). Wrapper `src/components/ui/BottomSheet.tsx`.

```ts
type BottomSheetProps = {
  open: boolean; onClose: () => void;
  title?: string;
  snapPoints?: (string | number)[];   // padrão ["55%", "90%"]; "dynamic" usa enableDynamicSizing
  footer?: ReactNode;                 // fixo na base (BottomSheetFooter)
  scrollable?: boolean;               // usa BottomSheetScrollView / BottomSheetFlatList
  children: ReactNode;
};
```

- **Conteúdo sempre dentro de `ThemeScope`** com o esquema atual (o portal perde as variáveis de tema).
- Painel: `backgroundStyle` = `surface`, cantos superiores 16 (`rounded-t-xl`), `elevation("e3")`/borda superior `border-strong` no dark.
- Alça: `handleIndicatorStyle` 36×4 pt `fg-subtle/40`, área de arraste 24 pt.
- Header do sheet: título `h3` à esquerda + IconButton `X` ("Fechar") à direita, `px-5 pb-3 border-b border-border`.
- Backdrop: `BottomSheetBackdrop` com `opacity 0.7` (`overlay`), toque fecha, `appearsOnIndex 0`.
- Footer fixo: `px-5 pt-3 bg-surface border-t border-border`, `paddingBottom: max(insets.bottom, 12)`. Botões `fullWidth`; com duas ações, lado a lado (secundária à esquerda, primária à direita, 1:2).
- Animação `spring.sheet`; arrastar para baixo fecha; `enablePanDownToClose`.
- Teclado: `keyboardBehavior="interactive"`, `android_keyboardInputMode="adjustResize"`; inputs dentro usam `BottomSheetTextInput`.
- Back do Android fecha o sheet antes de sair da tela (`useBackHandler`).
- A11y: `accessibilityViewIsModal`, foco inicial no título.

---

## 9. Modal

Dois usos, ambos centralizados (no app, diálogo curto é modal central; conteúdo longo é BottomSheet):

### 9.1 Dialog
- RN `Modal` `transparent` `animationType="fade"` + `statusBarTranslucent`, envolvido em `ThemeScope`.
- Backdrop `bg-overlay/70`; toque fora fecha (exceto em loading).
- Painel: `mx-6 max-w-[400px] w-full self-center rounded-xl bg-surface border border-border p-5`, entrada escala 0.96 → 1 + fade (200 ms).
- Estrutura: ícone opcional (círculo 48 pt tonal) → título `h3` → texto `body fg-muted` → ações empilhadas `fullWidth` (primária em cima) ou lado a lado se os dois rótulos forem curtos.
- `onRequestClose` (back do Android) fecha.

### 9.2 ConfirmDialog (destrutivo)
Ícone `Trash2` em círculo `bg-flame-soft`, cor `flame`. Título "Remover da coleção?". Texto: "**{title}** sai da sua coleção." Ações: "Remover" (`danger`, loading ao confirmar) e "Cancelar" (`ghost`). Haptic `Warning` ao confirmar. Nunca usar `Alert.alert` para isso.

---

## 10. EmptyState

```ts
type EmptyStateProps = {
  kind: "no-cars" | "no-content";
  description?: string;      // linha auxiliar opcional
  action?: { label: string; onPress: () => void; icon?: LucideIcon };
  size?: "lg" | "sm";
};
```

**O título vem da especificação e não é editável por props:**
- `no-cars` → **"Nenhuma miniatura disponível no momento."** (ícone `Car`)
- `no-content` → **"Nenhum conteúdo disponível."** (ícone `Inbox`)

`lg` (tela): coluna centralizada `items-center px-8 py-16 max-w-[320px] self-center gap-3`:
1. Ilustração: círculo 88 pt `bg-surface-2 border border-border` com ícone 36 `fg-subtle`; por cima, um arco SVG de 2 pt cobrindo 1/3 da borda com o gradiente flame (assinatura da marca).
2. Título `h3 text-fg text-center`.
3. `description` `body-sm fg-muted text-center`.
4. `action` como `Button outline md`.

`sm` (dentro de sheet, seção ou carrossel): ícone 24 sem círculo, título `body-sm fg-muted`, `py-8`.

Usos: busca sem resultado → `no-cars` + "Tente outro termo ou limpe os filtros." + ação "Limpar filtros". Coleção vazia → `no-cars` + ação "Explorar miniaturas". Série/marca/ano/atributo sem opções → `no-content` `sm`.
A11y: o bloco é um único elemento acessível lendo título + descrição.

---

## 11. Skeleton

- Primitivo: `View` `bg-surface-3 rounded-md` com opacidade animada 0.5 ↔ 1 (1,4 s, `withRepeat`), `accessible={false}`. Movimento reduzido: estático em 0.7.
- O container da tela recebe `accessibilityState={{ busy: true }}` e `accessibilityLabel="Carregando"`.
- Primitivas: `Skeleton.Rect`, `Skeleton.Circle`, `Skeleton.Text lines={n}` (linhas de 12 pt, larguras 100/80/60%).
- Compostos (mesma geometria dos reais, zero salto de layout):
  - `CarCardSkeleton`: rect `aspect-card` (cantos superiores) + eyebrow 40% + título 90%/60% + linha 50%.
  - `CarGridSkeleton`: 6 cards em 2 colunas (preenche a primeira dobra).
  - `SeriesRailSkeleton`: 2,3 cards de série em faixa horizontal.
  - `CarDetailSkeleton`: hero `aspect-gallery` + eyebrow + título 2 linhas + fileira de 3 badges + bloco de 4 linhas.
  - `ProfileSkeleton`: círculo 88 + 2 linhas + 3 stats.
- Regra: só aparece se a carga passar de **150 ms** (hook `useDelayedFlag(loading, 150)`); crossfade de 200 ms para o conteúdo.

---

## 12. FilterChips

Dois componentes relacionados.

### 12.1 `FilterChip`
```ts
type FilterChipProps = {
  label: string; selected?: boolean; count?: number;
  kind?: "toggle" | "dropdown" | "removable";
  onPress: () => void;
};
```
- `h-9 flex-row items-center gap-1.5 rounded-sm px-3 border`, `hitSlop` vertical 4 (toque 44).
- Repouso: `bg-surface border-border-strong`, texto `body-sm fg`. Selecionado: `bg-primary-soft border-primary/60`, texto `primary-text`, ícone `Check` 14 à esquerda (toggle).
- `dropdown`: `ChevronDown` 14 à direita; com seleção, mostra valor ("Série: J-Imports") ou contador ("Atributos · 2").
- `removable`: `X` 14 à direita; toque remove o filtro.
- Haptic `selection` ao alternar. `accessibilityRole="checkbox"` (toggle) ou `button`, `accessibilityState.checked/selected`.

### 12.2 `FilterChipsRow`
- `ScrollView horizontal` com `contentContainerClassName="px-4 gap-2"`, `showsHorizontalScrollIndicator={false}`, fade de 16 pt nas bordas (LinearGradient `bg` → transparente) indicando mais conteúdo.
- Primeiro chip: botão `Filtros` (ícone `SlidersHorizontal` + Badge `count` com o nº de filtros ativos) que abre o `FilterSheet`.
- Em seguida, um chip `dropdown` por dimensão (**Ano, Série, Marca, Atributos**; na Coleção também `toggle` **"Repetidos"**). Tocar num chip abre o FilterSheet já rolado para aquela seção.
- Com filtros ativos, aparece ao final o chip `ghost` "Limpar".

### 12.3 `FilterSheet` (usa BottomSheet 90%)
- Seções empilhadas, cada uma com título `eyebrow` e contador de selecionados:
  - **Ano**: chips dos anos existentes, decrescente, multisseleção.
  - **Série**: seleção única (chips); série em destaque com dot flame.
  - **Marca**: seleção única (chips).
  - **Atributos**: multisseleção (chips).
  - **Repetidos** (só Coleção): Switch "Apenas repetidos".
- Cada seção mostra os **8 primeiros** + chip "Ver todos (N)" que expande a seção inline; seção com mais de 20 opções ganha um SearchBar interno ao expandir.
- Carregando opções: 4 chips skeleton por seção. Sem opções: `EmptyState no-content sm`.
- Footer fixo: "Limpar" (`ghost`, 1/3) + "Ver N resultados" (`primary`, 2/3, contagem ao vivo com debounce 200 ms; com 0 resultados vira "Nenhum resultado" desabilitado).
- As seleções são rascunho: só se aplicam ao tocar em "Ver resultados". Fechar arrastando descarta o rascunho.

---

## 13. FavoriteButton

Adiciona/remove o carro da **coleção** (conceito "like/favorito" do portal).

```ts
type FavoriteButtonProps = {
  active: boolean; onToggle: () => void;
  variant?: "glass" | "solid";   // glass: sobre imagem; solid: barra de ação
  size?: "sm" | "md" | "lg";     // 32 / 40 / 44 visual; toque sempre ≥ 44
};
```

| Estado | Visual |
|---|---|
| Fora da coleção | `Heart` contorno branco (glass) ou `fg` (solid) |
| Na coleção | `Heart` preenchido `flame`, glow vermelho (`glow("#FF3838")`), pop 1 → 1.25 → 1 |
| Sem sessão | toque abre o login em modal com `intent=add&carId`; o coração não muda antes do login e, depois de entrar, fica ativo sozinho |
| Otimista | muda na hora; se o service rejeitar, reverte com animação inversa + Toast "Não foi possível atualizar sua coleção." + haptic Error |
| Enquanto a promessa não volta | toques repetidos são ignorados (sem spinner) |

- Glass: círculo `rounded-full bg-black/45`. Solid: `rounded-md bg-surface-3 h-11 w-11`.
- Haptic `impactLight` ao adicionar. Remover pelo coração **não** pede confirmação quando `quantity === 1` (é um toggle leve e reversível); se `quantity > 1`, abre ConfirmDialog "Remover todas as {n} unidades?".
- Toast de sucesso só ao adicionar: "Adicionada à sua coleção." com ação "Ver" → `/(tabs)/colecao`.
- A11y: `accessibilityRole="button"`, `accessibilityState={{ selected: active }}`, label "Adicionar à coleção" / "Remover da coleção".

---

## 14. ShareWhatsAppButton

```ts
type ShareWhatsAppButtonProps = {
  car: { title: string; brandName?: string; year: number; collector: string; toy: string; serieTitle?: string };
  variant?: "button" | "icon";   // button: barra do detalhe; icon: header
};
```

- `button`: `Button secondary md` com `WhatsAppIcon` 20 (monocromático, `currentColor` = `fg`) e label "Compartilhar". `icon`: IconButton `glass`/`ghost` com o mesmo ícone, label "Compartilhar no WhatsApp".
- Mensagem (fase 1, sem URL pública):
  ```
  Olha essa miniatura da minha coleção no ToSave:
  *{title}*
  {brandName} · {year} · #{collector}
  Série: {serieTitle}
  Código: {toy}
  ```
  Linhas sem valor são omitidas. Na fase 2, acrescentar o link do carro no portal.
- Fluxo: `Linking.canOpenURL("whatsapp://send")` → `Linking.openURL("whatsapp://send?text=" + encodeURIComponent(msg))`. Se não tiver WhatsApp instalado → `Share.share({ message: msg })` (share sheet nativo). Se ambos falharem → Toast "Não foi possível compartilhar agora."
- iOS exige `LSApplicationQueriesSchemes: ["whatsapp"]` (já no `app.json` do DS §2).
- Haptic `impactLight` ao tocar.

---

## 15. GalleryViewer

Duas partes: a **galeria inline** no topo do detalhe e o **visualizador em tela cheia**.

### 15.1 Galeria inline (`CarGallery`)
- `FlatList horizontal pagingEnabled` de largura total, altura = largura × 0,75 (`aspect-gallery`), fundo palco.
- Imagens: `imagemFull` primeiro, depois `CarImage` ordenadas por `position`. Sem nenhuma → palco com `Car` 56.
- Indicador: dots na base (6 pt, ativo 16×6 `primary`, inativos `white/40`), ou contador mono `2 / 5` em Badge glass no canto inferior direito quando > 6 imagens.
- Tocar abre o visualizador no índice atual. Com 1 imagem, sem dots.

### 15.2 Visualizador (`GalleryViewer`)
```ts
type GalleryViewerProps = {
  images: { id: string; uri: string }[];
  initialIndex: number; open: boolean; onClose: (lastIndex: number) => void;
  title?: string;
};
```
- RN `Modal` `animationType="fade"` `presentationStyle="overFullScreen"` `statusBarTranslucent`, fundo `black` (sempre, independe do tema), `ThemeScope dark`. Status bar oculta.
- Pager horizontal (FlatList `pagingEnabled`) com cada página zoomável (Gesture Handler + Reanimated):
  - **Pinch** 1× a 4×, com foco no ponto do gesto.
  - **Duplo toque** alterna 1× ↔ 2,5× no ponto tocado.
  - **Pan** com zoom > 1 move a imagem; nas bordas, passa para a página vizinha.
  - **Arrastar para baixo** com zoom 1× fecha (fundo esmaece proporcional ao deslocamento; solta além de 120 pt ou com velocidade > 800 fecha, senão volta com `spring.sheet`).
  - **Toque simples** mostra/oculta os controles (fade 200 ms).
- Controles (sobre gradiente preto de 96 pt em cima e embaixo): IconButton `X` glass à esquerda (respeita `insets.top`), título `body-sm` branco ao centro, contador `2 / 5` mono à direita; na base, tira de thumbs 48×36 `rounded-sm` com a ativa em borda `primary` 2 pt (só com ≥ 3 imagens).
- `expo-image` `contentFit="contain"`, pré-carrega a vizinha (`Image.prefetch`).
- Permite paisagem enquanto aberto (`expo-screen-orientation` desbloqueia ao abrir e trava em retrato ao fechar).
- Back do Android fecha. Ao fechar, a galeria inline pula para o último índice visto.
- A11y: cada imagem `accessibilityLabel="Foto {n} de {total} de {title}"`; ações `accessibilityActions` "próxima"/"anterior" para leitor de tela.
- Movimento reduzido: sem animação de zoom no duplo toque (salta direto), fechar por fade.

---

## C. Complementares

Necessários às telas da fase 1.

| # | Componente | Resumo |
|---|---|---|
| C.1 | **Text** | `variant` = token de tipografia (DS §5.2) + `tone` (`fg`, `muted`, `subtle`, `primary`, `accent`, `flame`, `danger`, `ink`). Aplica família, cor e `maxFontSizeMultiplier`. |
| C.2 | **QuantityStepper** | `− n +` com `font-mono body`, botões 32 visuais (toque 44, 8 pt entre eles). Variantes `glass` (sobre imagem, compacto h-8) e `secondary` (detalhe, h-11, número 40 pt de largura). Mín. 1 (abaixo disso chama `onRemoveRequest`), máx. 99. `accessibilityRole="adjustable"` com `accessibilityActions increment/decrement`, valor "2 unidades". Haptic `selection`. |
| C.3 | **Toast** | Host único no root (`ToastProvider`, `useToast().show({ type, message, action? })`). `rounded-lg bg-surface border border-border border-l-4` (success/danger/info) + ícone + texto `body-sm` + ação `primary-text`. Topo, `insets.top + 8`, 4 s. `accessibilityLiveRegion="polite"` / anúncio. |
| C.4 | **Avatar** | 32/56/88 pt, `rounded-full`, iniciais em `font-display` sobre `bg-primary-soft text-primary-text`. Com borda de 2 pt em gradiente flame no tamanho 88 (Perfil). |
| C.5 | **SegmentedControl** | `flex-row bg-surface-2 rounded-md p-1 h-11`, itens `flex-1`, ativo `bg-surface-3 border border-border` com slide animado do fundo (200 ms). Tema no Perfil (Escuro · Claro · Sistema). `accessibilityRole="radiogroup"`/`radio`. |
| C.6 | **Logo** | `variant: "auto" \| "dark" \| "light"`, `size: "sm" (96) \| "md" (180) \| "lg" (220)`. `auto` escolhe pelo tema atual; dentro de `ThemeScope dark` é sempre `dark`. `expo-image` com `contentFit="contain"`, `accessibilityLabel="ToSave"`. |
| C.7 | **SectionHeader** | `flex-row items-end justify-between px-4 mb-3`: título `h2` + subtítulo opcional `body-sm fg-muted`; à direita, link "Ver tudo" `body-sm font-sans-medium text-primary-text` + `ChevronRight` 16 (toque 44). |
| C.8 | **SeriesCard** | Card de série para a faixa da Home: 280×160 pt `rounded-lg overflow-hidden`, imagem `cover`, gradiente preto de baixo (0 → 80%), título `h3` branco, descrição 1 linha `body-sm white/70`, Badge `flame` "Em destaque" no canto superior. Toque → Busca filtrada pela série. |
| C.9 | **FeaturedSeriesCarousel** | Faixa horizontal de SeriesCard com `snapToInterval` (card + 12), padding 16, peek do próximo card. Sem autoplay (no mobile, o usuário controla). 1 série: card em largura total − 32. |
| C.10 | **ErrorState** | Igual EmptyState `lg`, ícone `AlertCircle` em círculo `flame-soft`, título "Não foi possível carregar.", descrição "Verifique sua conexão e tente novamente.", ação `secondary` "Tentar novamente" (`RotateCw`). Versão `sm` para seções. |
| C.11 | **InfoRow** | Linha de atributo do detalhe: ícone 18 `fg-subtle` + label `body-sm fg-muted` à esquerda, valor `body fg` (ou `font-mono`) à direita, `min-h-12`, divisória hairline `border`. Tocar em valores copiáveis (toy, collector) copia com `expo-clipboard` + Toast "Código copiado." |
| C.12 | **StatTile** | Perfil e Coleção: número `display-xl font-display-black text-accent` + label `caption fg-muted uppercase`. |
| C.13 | **ListRow** | Linha de menu do Perfil: ícone 20 em quadrado 32 `bg-surface-3 rounded-md` + label `body` + valor/`ChevronRight`, `min-h-14`, `px-4`, pressed `bg-surface-3`. Variante `danger` para "Sair". |
| C.14 | **ThemeScope** | Reaplica `themeVars[scheme]` numa subárvore (DS §4.3). Obrigatório em portais (Modal, BottomSheet, GalleryViewer) e superfícies ink. |
| C.15 | **ScreenContainer** | `SafeArea` + `bg-bg` + `StatusBar` correta + padding inferior da TabBar. Props `edges`, `ink`. Toda tela começa por ele. |
| C.16 | **LoginGate** | Fallback de Coleção e Perfil abertos sem sessão (deep link). Mesmo layout do EmptyState `lg`, ícone `Lock` no círculo, título "Entre para ver sua coleção" (Coleção) ou "Entre para acessar sua conta" (Perfil), texto "Suas miniaturas ficam salvas na sua conta.", `Button primary` "Entrar" → `requireSession({ next })`. Não substitui os empty states oficiais: só aparece quando falta sessão. |
