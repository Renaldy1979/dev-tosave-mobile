# ToSave — Componentes base

> Todos os valores referenciam tokens de `design-system.md`. Caminho de implementação: `src/components/ui/`.
> Convenções: API em React/TS, `className` sempre mesclável (`cn()` = `clsx` + `tailwind-merge`), variantes via `class-variance-authority`, `forwardRef` em todo elemento interativo, ícones Lucide.

Índice: [Button](#1-button) · [IconButton](#2-iconbutton) · [Input](#3-input) · [Select](#4-select) · [Badge](#5-badge) · [CarCard](#6-carcard) · [Navbar + TabBar](#7-navbar--tabbar) · [Modal / Sheet / ConfirmDialog](#8-modal) · [EmptyState](#9-emptystate) · [Skeleton](#10-skeleton) · [Pagination](#11-pagination) · [FilterBar](#12-filterbar) · [Complementares](#13-complementares)

---

## 1. Button

```ts
type ButtonProps = {
  variant?: "primary" | "secondary" | "ghost" | "outline" | "danger" | "flame";
  size?: "sm" | "md" | "lg";
  leftIcon?: LucideIcon; rightIcon?: LucideIcon;
  loading?: boolean; fullWidth?: boolean; asChild?: boolean; // asChild → <Link>
} & ButtonHTMLAttributes<HTMLButtonElement>;
```

Base: `inline-flex items-center justify-center gap-2 rounded-md font-medium transition duration-fast ease-out-expo active:scale-[0.98] focus-visible:ring-2 ring-ring ring-offset-2 ring-offset-bg disabled:opacity-40`.

| Variante | Classes | Quando usar |
|---|---|---|
| `primary` | `bg-primary text-primary-fg hover:bg-primary-hover` | 1 por tela/contexto: "Entrar", "Adicionar à coleção", "Salvar" |
| `secondary` | `bg-surface-3 text-fg hover:bg-border-strong` | Ação paralela: "Compartilhar", "Cancelar" em forms |
| `outline` | `border border-border-strong text-fg hover:border-primary hover:text-primary-text` | "Exibir tudo", filtros |
| `ghost` | `text-fg-muted hover:bg-surface-3 hover:text-fg` | Ações terciárias, navbar |
| `danger` | `bg-danger text-white hover:bg-danger/90` | Confirmar exclusão (só dentro de ConfirmDialog) |
| `flame` | `bg-flame bg-[length:200%] text-primary-fg font-semibold shadow-glow hover:bg-right` (gradiente da marca) | **Apenas** o CTA principal do hero e o "Criar administrador" do /setup |

| Tamanho | Altura | Padding | Texto | Ícone |
|---|---|---|---|---|
| `sm` | 36 px | `px-3` | `body-sm` | 16 |
| `md` | 44 px | `px-4` | `body` | 18 |
| `lg` | 52 px | `px-6` | `body-lg font-semibold` | 20 |

**Estados:** hover · focus-visible · active · disabled · **loading** (spinner `Loader2 animate-spin` no lugar do `leftIcon`, texto mantido, largura travada, `aria-busy`, clique ignorado).
**Mobile:** botões de ação principal em formulários são `fullWidth` abaixo de `sm`.

## 2. IconButton

Botão quadrado só com ícone. **`aria-label` obrigatório.**
- Variantes: `ghost` (padrão), `secondary`, `glass` (sobre imagem: `bg-black/45 backdrop-blur-md text-white hover:bg-black/60` — usado no CarCard e na galeria).
- Tamanhos: `sm` 32 px (ícone 16), `md` 40 px (ícone 20), `lg` 44 px (ícone 22). Em mobile, o alvo de toque mínimo é 44 px (usar padding invisível se o visual for 32 px).
- Formato: `rounded-md`; `rounded-full` para favorito.

### FavoriteButton (especialização)
| Estado | Visual |
|---|---|
| Não favoritado | `Heart` contorno, `glass` |
| Hover | ícone `text-flame` |
| Favoritado | `Heart` preenchido `fill-flame text-flame`, `animate-heart-pop`, `shadow-[0_0_16px_rgb(var(--flame)/.5)]` |
| Pendente (otimista) | já mostra estado final; se o servidor falhar, reverte + toast "Não foi possível atualizar sua coleção." |
| Deslogado | clique abre Modal de login (ver telas/login.md §Modal) em vez de navegar |

`aria-pressed` reflete o estado; label: "Adicionar à coleção" / "Remover da coleção".

## 3. Input

```ts
type InputProps = {
  label: string; hint?: string; error?: string;
  leftIcon?: LucideIcon; rightSlot?: ReactNode; size?: "md" | "lg";
} & InputHTMLAttributes<HTMLInputElement>;
```

- Estrutura: `label` (`body-sm font-medium text-fg`, 6 px acima) → campo → `hint` ou `error` (`caption`, 6 px abaixo).
- Campo: `h-11` (md) / `h-13` (lg, busca do hero), `rounded-md bg-surface-2 border border-border-strong px-3.5 text-body text-fg placeholder:text-fg-subtle`.
- Com `leftIcon`: `pl-10`, ícone `text-fg-subtle` 18 px.

| Estado | Visual |
|---|---|
| Default | borda `border-strong` |
| Hover | borda `fg-subtle` |
| Focus | borda `primary` + `ring-4 ring-primary/15` (sem offset) |
| Erro | borda `danger`, `ring-danger/15` no foco, ícone `AlertCircle` à direita, `error` em `text-danger`, `aria-invalid` |
| Disabled | `opacity-50 bg-surface-3 cursor-not-allowed` |
| Read-only | sem borda, `bg-transparent`, `px-0` |

**Variações:**
- `PasswordInput`: `rightSlot` com IconButton `Eye`/`EyeOff` ("Mostrar senha").
- `SearchInput`: `leftIcon Search`, botão `X` limpar quando há valor, atalho visual `/` (kbd) em desktop; submit no Enter e debounce 300 ms para busca ao vivo.
- `Textarea`: mesmo estilo, `min-h-[120px] py-3`, contador de caracteres opcional no canto.
- `ColorInput` (admin, campo `color`): input de texto + swatch 28 px à esquerda que renderiza o valor se for hex válido; se for texto ("Vermelho metálico"), swatch mostra ícone `Palette`.
- `MonoInput` (collector, toy, seriePosition, scale): `font-mono`, preserva zeros à esquerda (sempre `type="text"`, nunca `number`).

## 4. Select

Duas implementações, mesma aparência:
- **`Select`** (nativo estilizado) — opções curtas e fixas (role, status, ordenação). Mesmo visual do Input + `ChevronDown` à direita. Em mobile abre o picker nativo (melhor UX).
- **`Combobox`** (busca + lista, Radix Popover/cmdk) — opções vindas do banco e potencialmente longas: marca, série, atributos (multi). Popover `rounded-lg bg-surface shadow-pop max-h-72`, campo de busca no topo, item ativo `bg-surface-3`, selecionado com `Check text-primary-text`. Multi-seleção mostra chips dentro do campo (máx. 2 visíveis + "+N").

| Estado | Visual |
|---|---|
| Aberto | borda `primary`, chevron rotaciona 180° |
| Carregando opções | 3 linhas Skeleton no popover |
| Sem opções | "Nenhum conteúdo disponível." centralizado `text-fg-subtle` |
| Erro | igual Input |

Mobile (< `md`): Combobox abre como **BottomSheet** de altura 80 dvh em vez de popover.

## 5. Badge

`inline-flex items-center gap-1 rounded-xs px-2 h-6 text-caption font-medium`

| Variante | Classes | Uso |
|---|---|---|
| `neutral` | `bg-surface-3 text-fg-muted` | ano, escala, atributos |
| `primary` | `bg-primary-soft text-primary-text` | série, filtro ativo |
| `accent` | `bg-accent-soft text-accent font-mono` | número de coleção `#001` |
| `flame` | `bg-flame-soft text-flame` | "Série em destaque" (isDefault), repetido |
| `glass` | `bg-black/50 backdrop-blur text-white` | sobre imagem (posição na série `8/10`) |
| `success` / `danger` | tonais | status de usuário (ativo/inativo) |
| `brandState` | `ativa` → success · `descontinuada` → neutral + `Archive` · `em análise` → `bg-accent-soft text-accent` + `Clock` | situação da marca (`Brands.state`) |
| `outline` | `border border-border text-fg-muted` | contagem em filtros |

Tamanhos: `sm` (h-5, 11 px) e `md` (h-6). Opcional `icon` (14 px) e `dot` (círculo 6 px da cor).

**Badge de cor do carro:** dot 10 px com a cor hex (borda `border-strong` para cores muito escuras/claras) + nome/valor.

## 6. CarCard

O componente mais importante do produto. Referência visual: card de marketplace premium — **imagem domina, texto é legenda.**

```ts
type CarCardProps = {
  car: { id; title; imagemThumb; collector; seriePosition; year; toy; brand?: {name}; serie?: {title} };
  variant?: "catalog" | "collection" | "compact";
  isFavorite?: boolean; quantity?: number; // collection
  priority?: boolean; // next/image priority para os 4 primeiros
};
```

### Anatomia (variant `catalog`)

```
┌──────────────────────────────┐
│ #001                     ♡   │  ← Badge accent (collector)   FavoriteButton glass
│                              │
│        [ IMAGEM 4:3 ]        │  ← palco bg-card-stage, object-cover, rounded-t-lg
│                              │
│                        8/10  │  ← Badge glass (seriePosition)
├──────────────────────────────┤
│ MATTEL · 2024                │  ← eyebrow text-fg-subtle (marca · ano)
│ '71 Datsun 510 Wagon         │  ← h3 body font-semibold, line-clamp-2
│ HW J-Imports        HKJ42    │  ← body-sm fg-muted (série) · font-mono fg-subtle (toy)
└──────────────────────────────┘
```

- Container: `group relative rounded-lg bg-surface shadow-card overflow-hidden transition duration-slow ease-out-expo hover:shadow-card-hover hover:-translate-y-0.5`.
- Imagem: `aspect-card`, `transition-transform duration-slow group-hover:scale-[1.04]`. `sizes="(min-width:1536px) 20vw, (min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw"`.
- Corpo: `p-3 sm:p-4 space-y-1`. Altura do corpo fixa por variante para o grid ficar alinhado (título sempre reserva 2 linhas).
- Card inteiro é um `<Link href="/car/[id]">` (área clicável total); o FavoriteButton fica acima com `z-10` e `stopPropagation`.
- Sublinhado de marca: no hover, uma linha de 2 px `bg-flame` cresce da esquerda na base da imagem (`scale-x-0 → scale-x-100`, origin-left).

### Variantes
| Variante | Diferença |
|---|---|
| `catalog` | Como acima |
| `collection` | Troca o FavoriteButton por **QuantityStepper** compacto (glass, `– 2 +`) no canto superior direito; se `quantity > 1`, Badge `flame` "Repetido ×2" abaixo do título. Remover a última unidade abre ConfirmDialog. |
| `compact` | Linha horizontal: thumb 72×54 `rounded-md` + título + toy. Usado em "Mais da série" (detalhe) e em listas mobile do admin. |

### Estados
| Estado | Visual |
|---|---|
| Loading | `CarCardSkeleton` (mesma geometria, ver §10) |
| Sem imagem | palco com ícone `Car` 48 px `text-fg-subtle/40` |
| Erro ao carregar imagem | mesmo placeholder (onError) |
| Focus-visible | anel `ring-2 ring-ring ring-offset-2 ring-offset-bg` no card inteiro |
| Mobile (2 colunas) | `p-3`, título `body-sm font-semibold`, oculta toy (fica só série), FavoriteButton 32 px visual / 44 px toque |

## 7. Navbar + TabBar

### Navbar (colecionador / público)
Sempre `ink` (dark nos dois temas). `sticky top-0 z-navbar h-14 lg:h-16 bg-ink/80 backdrop-blur-xl border-b border-white/5`.

```
Mobile:  [Logo 96px]                         [🔍] [◐]
Desktop: [Logo 128px]  Catálogo  Minha coleção   [ Buscar miniaturas…  / ]   [◐] [Avatar ▾] | [Entrar]
```

- Links: `body-sm font-medium text-fg-muted hover:text-fg`; ativo `text-fg` + sublinhado 2 px `bg-flame` de 16 px centralizado abaixo.
- Busca (desktop): `SearchInput` compacto `w-72 h-10`, expande para `w-96` no foco. Mobile: ícone que abre overlay de busca em tela cheia (input no topo, sugestões recentes, `Esc`/voltar fecha).
- Deslogado: `Button ghost sm "Entrar"` + `Button primary sm "Criar conta"` (só `md+`; no mobile apenas "Entrar").
- Logado: Avatar 32 px (iniciais sobre `bg-primary-soft text-primary-text` se não houver imagem) → dropdown: nome/email, "Perfil", "Minha coleção", "Painel admin" (só ADMIN), toggle de tema, divisor, "Sair".
- Rolagem: some ao rolar para baixo (> 120 px) e reaparece ao rolar para cima (só mobile).

### TabBar (mobile < `md`, apenas colecionador logado ou público)
`fixed bottom-0 inset-x-0 z-tabbar h-16 pb-[env(safe-area-inset-bottom)] bg-ink/90 backdrop-blur-xl border-t border-white/5`. 4 itens: **Início** (`Home`), **Buscar** (`Search` – foca a busca), **Coleção** (`Heart`), **Perfil** (`User`; deslogado → "Entrar" `LogIn`).
Item: ícone 24 + label `caption`; ativo `text-primary` com ícone preenchido; inativo `text-fg-subtle`. Página ganha `pb-20` para não ficar atrás da barra.

### AdminShell
- `lg+`: **Sidebar** fixa 248 px `bg-surface border-r border-border`: `<Logo variant="auto">` no topo (usa `logo-light.png` no tema light, ver `marca.md`), grupos "Visão geral" (Dashboard), "Catálogo" (Miniaturas → Atributos aninhado, Séries, Marcas), "Sistema" (Configurações); rodapé com "Ver site" (`ExternalLink`) e avatar/sair. Item ativo: `bg-primary-soft text-primary-text` + barra 3 px `bg-primary` à esquerda.
- `< lg`: Navbar ink com botão `Menu` que abre a sidebar como **drawer** da esquerda (`w-[280px]`, overlay).
- Topbar de conteúdo: breadcrumb `body-sm fg-subtle` + título `h1` + ações à direita.

## 8. Modal

Radix Dialog. Backdrop `bg-overlay/70 backdrop-blur-sm animate-fade-in`.

| Tamanho | Largura |
|---|---|
| `sm` | 400 px (confirmações) |
| `md` | 520 px (login rápido, formulários curtos) |
| `lg` | 720 px |
| `full` | galeria em tela cheia (lightbox) |

- Painel: `rounded-xl bg-surface shadow-modal border border-border`, header (`h3` + IconButton `X`), corpo `p-6`, footer com ações alinhadas à direita (secondary + primary).
- **Mobile (< `sm`): todo Modal vira BottomSheet** — ancorado na base, `rounded-t-xl`, alça de 36×4 px no topo, `max-h-[90dvh]` com scroll interno, `animate-sheet-up`, arrastar para baixo fecha. Footer fica fixo na base do sheet com botões `fullWidth` empilhados (primária em cima).
- Foco preso no modal, `Esc` fecha, foco volta ao gatilho.

### ConfirmDialog (destrutivo)
`sm`, ícone `AlertTriangle` em círculo `bg-flame-soft text-flame`, título ("Excluir série?"), texto com o nome do item em negrito e a consequência, botões "Cancelar" (secondary) + "Excluir" (`danger`, loading ao confirmar). Nunca usar `window.confirm`.

### Lightbox (galeria)
`full`, fundo `bg-black/95`, imagem `object-contain` centralizada, setas `glass` nas laterais (desktop), swipe (mobile), contador `3 / 7` em mono, tira de thumbs na base (desktop), pinch-zoom no mobile.

## 9. EmptyState

```ts
type EmptyStateProps = {
  kind: "no-cars" | "no-content";
  description?: string; action?: ReactNode; icon?: LucideIcon; size?: "sm" | "lg";
};
```

**O título vem da especificação e não é editável via props:**
- `no-cars` → **"Nenhuma miniatura disponível no momento."** (ícone padrão `Car`)
- `no-content` → **"Nenhum conteúdo disponível."** (ícone padrão `Inbox`)

Layout (`lg`, página): coluna centralizada `py-16 max-w-sm text-center`:
1. Ilustração: círculo 88 px `bg-surface-2 border border-border` com ícone 36 px `text-fg-subtle`, e um arco de 2 px com o gradiente `flame` em 1/3 da borda (assinatura visual da marca).
2. Título `h3 text-fg`.
3. `description` opcional `body-sm text-fg-muted`.
4. `action` opcional (Button).

`sm` (dentro de card/tabela/popover): ícone 24 px sem círculo, título `body-sm`, `py-8`.

## 10. Skeleton

`relative overflow-hidden bg-surface-2 rounded-md` + pseudo-elemento shimmer (`bg-gradient-to-r from-transparent via-white/[.04] to-transparent animate-shimmer`; light: `via-white/60`). `aria-hidden`, e o container pai recebe `aria-busy="true"`.

Primitivas: `Skeleton.Text` (linhas h-3.5 com larguras 100/80/60%), `Skeleton.Circle`, `Skeleton.Rect`.
Compostos (mesma geometria dos reais, para zero layout shift):
- `CarCardSkeleton`: rect `aspect-card rounded-t-lg` + eyebrow 30% + título 90%/60% + linha 50%.
- `CarGridSkeleton`: N `CarCardSkeleton` (padrão 8 mobile / 12 desktop).
- `DetailSkeleton`, `TableRowSkeleton`, `StatCardSkeleton`.

Regra: skeleton só aparece se o carregamento passar de 150 ms (evitar flash).

## 11. Pagination

Duas variantes:

**`load-more`** (catálogo público e coleção — sensação de feed, não de sistema):
- Texto `body-sm text-fg-subtle`: "Mostrando **24** de **1.240**" + barra fina 2 px (`bg-surface-3`, preenchimento `bg-flame` proporcional).
- `Button outline md` "Carregar mais" centralizado; loading enquanto busca; ao terminar, some e mostra "Você viu tudo." em `caption`.
- Estado da página refletido na URL (`?page=3`) para voltar do detalhe no mesmo ponto.

**`numbered`** (admin):
- `[‹]  1  2  3  …  12  [›]` — botões 36 px `rounded-md`, atual `bg-primary text-primary-fg`, demais `ghost`. À esquerda: "1–20 de 312". À direita: Select "20 / 50 / 100 por página".
- Mobile: só `‹  Página 3 de 12  ›`.

## 12. FilterBar

Filtros da especificação: **busca (nome ou toy), ano, série, marca, atributos**; na coleção, também **"Apenas repetidos"**.

### Desktop (`lg+`)
Barra `sticky top-16 z-sticky bg-bg/85 backdrop-blur border-b border-border py-3`:
```
[🔍 Buscar por nome ou código…      ]  [Série ▾] [Marca ▾] [Ano ▾] [Atributos ▾]  [Repetidos ○]
Ativos:  (Série: HW J-Imports ×) (2024 ×) (Atributos: 2 ×)   Limpar tudo                                       1.240 miniaturas
```
- Cada filtro é um **FilterChip** (`h-9 rounded-md border border-border-strong px-3 body-sm`, ativo = `bg-primary-soft text-primary-text border-primary/60` + contador). Abre popover `w-80`:
  - Campo de busca interno (para listas longas).
  - **Primeiros 8 itens** + botão "Exibir tudo (47)" que expande a lista com scroll (`max-h-80`). (Atende "listar os primeiros e oferecer busca ou botão exibir tudo".)
  - Série e Marca: seleção única com radio; Atributos: multi com checkbox; Ano: lista de anos existentes no banco, desc, multi.
  - Footer do popover: "Limpar" (ghost) + "Aplicar" (primary sm).
- Linha de chips ativos só aparece se houver filtro; cada chip remove individualmente.
- Contagem de resultados à direita, atualizada ao aplicar.

### Mobile / tablet (< `lg`)
Barra sticky compacta: `SearchInput` (flex-1) + `Button outline` quadrado `SlidersHorizontal` com Badge contador de filtros ativos. Abaixo, chips ativos em scroll horizontal.
O botão abre **BottomSheet "Filtros"** (90 dvh): seções em acordeão (Série, Marca, Ano, Atributos, Repetidos), cada uma com os 8 primeiros como chips grandes (44 px) + "Exibir tudo". Footer fixo: "Limpar" (ghost) + "Ver 312 resultados" (primary, fullWidth — contagem ao vivo).

### Comportamento
- Todo estado de filtro vive na URL (`?q=&serie=&brand=&year=&attr=&dup=1`) — compartilhável e sobrevive ao voltar.
- Busca: debounce 300 ms; se o termo parecer um código toy (alfanumérico sem espaço, ≥ 4 chars), resultados exatos de toy aparecem primeiro.
- Opções carregando: Skeleton de 4 chips. Sem opções: `EmptyState no-content size=sm`.

## 13. Complementares

Necessários para as telas da Fase 1; mesmas regras de token.

| Componente | Resumo |
|---|---|
| **ImageUpload** | Dropzone `aspect-card rounded-lg border-2 border-dashed border-border-strong bg-surface-2`, ícone `ImagePlus`, "Arraste uma imagem ou **clique para enviar**", "JPG, PNG ou WebP". Estados: hover/drag-over (`border-primary bg-primary-soft/40`), enviando (barra de progresso `bg-flame`), preenchido (preview + IconButtons glass "Trocar"/"Remover"), erro (borda danger + mensagem). Sem campo de URL — upload real obrigatório. |
| **GalleryUpload** | Grade de ImageUpload menores (1:1) com drag-and-drop para reordenar (`position`), `GripVertical` no hover, "+ Adicionar" como último tile. |
| **StatCard** | Dashboard: ícone em quadrado 40 px `bg-primary-soft text-primary-text rounded-md`, label `body-sm fg-muted`, número `display-lg font-display italic`, link "Ver todos →". |
| **DataTable** | Admin desktop: header `caption uppercase tracking-wide fg-subtle bg-surface-2`, linhas 64 px com thumb 56×42 `rounded-md`, hover `bg-surface-3/50`, ações em menu `MoreHorizontal` (Editar, Excluir). < `md`: vira lista de `CarCard compact`/linhas-cartão. |
| **Toast** | `rounded-lg bg-surface shadow-pop border-l-4` (success/danger/info), ícone + texto + fechar. |
| **Avatar** | 32/40/96 px, iniciais em `font-display`, `bg-primary-soft text-primary-text`. |
| **Switch** | 40×24, trilho `bg-surface-3` → `bg-primary`; usado em "Série em destaque", "Ativa", "Imagem verificada", "Apenas repetidos". |
| **QuantityStepper** | `– n +`, 32 px, `font-mono`; `glass` sobre imagem ou `secondary` no detalhe. |
| **ThemeToggle** | IconButton `Moon`/`Sun`, troca com rotação de 90° em 200 ms. |
| **WhatsAppShareButton** | `Button secondary` com ícone SVG do WhatsApp (monocromático `currentColor`), abre `https://wa.me/?text=` com título + URL do carro. Mobile: usa `navigator.share` se disponível, com fallback no WhatsApp. |
| **SectionHeader** | `h2` + subtítulo opcional + link "Ver tudo →" `text-primary-text` à direita. |
| **Logo** | `variant: "auto" \| "dark" \| "light"`, `size: "sm" (96) \| "md" (128) \| "lg" (220)`. `auto` renderiza as duas imagens e alterna por CSS (`.light` exibe `logo-light.png`), sem flash. Dentro de `.ink` sempre `dark`. Ver `marca.md`. |
| **Tabs** | Lista horizontal `h-11 border-b border-border`, item ativo `text-fg` com sublinhado 2 px `bg-flame`, inativo `text-fg-muted`, contador opcional (Badge outline). Estado na URL (`?tab=`). Mobile: scroll horizontal. Usado em `/admin/settings`. |
| **SegmentedControl** | Container `bg-surface-2 rounded-md p-1`, itens `h-9 px-3 body-sm`, ativo `bg-surface-3 text-fg shadow-card`. Tema (perfil), situação da marca, filtros de listagem admin. Mobile com > 3 opções vira Select. |
| **FeaturedSeriesCarousel** | Hero da home: slides das séries com `isDefault`, crossfade 320 ms, autoplay 6 s (pausa em hover/foco, desligado com reduced-motion), dots + setas glass. 1 série = estático. Mobile: faixa de cards com scroll-snap. |
