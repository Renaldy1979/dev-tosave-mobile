# ToSave — Design System

> Versão 1.0 · Fase 1 · Autor: Designer UI/UX
> Fonte de requisitos: `docs/ESPECIFICACAO.md`. Este documento define **como** o produto se parece; nunca **o que** ele faz.

## 1. Princípios

1. **A miniatura é a protagonista.** Imagem ocupa 60–75% de qualquer card; texto é legenda, não conteúdo principal.
2. **Garagem à noite.** Superfícies escuras em camadas (asfalto → carroceria → vidro), com laranja como "farol" de ação e vermelho como "chama" de emoção (favorito, destaque, perigo).
3. **Nunca um CRUD.** Até o admin usa hierarquia editorial: números grandes, thumbnails, seções nomeadas, ações contextuais. Nada de tabelas cinzas cruas com botões "Editar | Excluir" em texto.
4. **Mobile-first.** Todo layout é desenhado primeiro para 360 px e expande. Alvos de toque ≥ 44 px.
5. **Cor com parcimônia.** Laranja = ação primária/estado ativo. Amarelo = marca e números de coleção. Vermelho = favorito/destaque "hot" e erro. Nunca os três lado a lado fora do gradiente da marca.

## 2. Marca

A logo (`_brand/logo.png`, PNG com fundo transparente, 644×241) tem três cores amostradas pixel a pixel:

| Papel na logo | Hex exato | Token |
|---|---|---|
| Silhueta do carro | `#FD8401` | `orange-500` → **primary** |
| Wordmark "TOSAVE" | `#FFDE21` | `yellow-500` → **accent** |
| Chamas | `#FF0000` | `red-500` → **flame** |

**Uso da logo**
- Tema dark: logo original sobre `bg`/`surface`. Contraste ótimo.
- Tema light: o amarelo `#FFDE21` sobre branco tem contraste insuficiente. Regra (aprovada): **a Navbar e o Hero são sempre superfícies "ink" (dark) nos dois temas**, o que também reforça a identidade "garagem". Onde a logo aparece sobre superfície clara (sidebar do admin, rodapé e 404 no tema light), usa-se a variante derivada `_brand/logo-light.png`.
- Tamanho mínimo: 96 px de largura (mobile navbar); 128 px desktop navbar; 220 px em telas de auth.
- Área de respiro: altura do "T" em todos os lados.
- Variantes, favicon e regras de uso por superfície: **`marca.md`**.

**Gradiente da marca ("flame")** — reproduz a transição da logo, usado com parcimônia (sublinhado ativo, palavra de destaque no hero, borda do card em hover, barra de progresso de upload):

```css
--gradient-flame: linear-gradient(100deg, #FFDE21 0%, #FD8401 45%, #FF0000 100%);
```

## 3. Paleta primitiva

Escalas geradas a partir das cores da logo (500 = valor exato da marca).

### Orange (primary)
| 50 | 100 | 200 | 300 | 400 | **500** | 600 | 700 | 800 | 900 | 950 |
|---|---|---|---|---|---|---|---|---|---|---|
| `#FFF5E6` | `#FFE7C2` | `#FFCF85` | `#FFB347` | `#FF9A1A` | **`#FD8401`** | `#E06E00` | `#B85600` | `#8F4300` | `#6B3200` | `#3D1C00` |

### Yellow (accent)
| 50 | 100 | 200 | 300 | 400 | **500** | 600 | 700 | 800 | 900 |
|---|---|---|---|---|---|---|---|---|---|
| `#FFFBE6` | `#FFF5BF` | `#FFEC80` | `#FFE54D` | `#FFE133` | **`#FFDE21`** | `#E6C200` | `#B39700` | `#806C00` | `#594B00` |

### Red (flame)
| 50 | 100 | 200 | 300 | 400 | **500** | 600 | 700 | 800 | 900 |
|---|---|---|---|---|---|---|---|---|---|
| `#FFF0F0` | `#FFD6D6` | `#FFA8A8` | `#FF6B6B` | `#FF3838` | **`#FF0000`** | `#E00000` | `#B30000` | `#800000` | `#4D0000` |

### Neutral ("asphalt", levemente frio)
| 0 | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 850 | 900 | 950 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `#FFFFFF` | `#F6F6F8` | `#EBEBEF` | `#D6D6DD` | `#B4B4BE` | `#8A8A96` | `#5B5B66` | `#3A3A43` | `#26262D` | `#1C1C21` | `#16161A` | `#111114` | `#0B0B0D` |

### Status
| Token | Dark | Light |
|---|---|---|
| success | `#22C55E` | `#15803D` |
| warning | `#FFDE21` (yellow-500) | `#806C00` (yellow-800) |
| danger | `#FF3838` (red-400) | `#E00000` (red-600) |
| info | `#60A5FA` | `#2563EB` |

## 4. Tokens semânticos (CSS variables)

Os componentes **nunca** usam cores primitivas diretamente para superfícies e texto — só tokens semânticos. Os valores são canais RGB separados por espaço, para permitir opacidade no Tailwind (`bg-primary/20`).

**Tema padrão: dark.** O tema light é opt-in via toggle (persistido; respeita `prefers-color-scheme` só se o usuário escolher "Sistema").

| Token | Uso | Dark | Light |
|---|---|---|---|
| `--bg` | fundo da página | `11 11 13` (#0B0B0D) | `246 246 248` (#F6F6F8) |
| `--surface` | cards, painéis | `22 22 26` (#16161A) | `255 255 255` |
| `--surface-2` | fundo da imagem no card, inputs | `28 28 33` (#1C1C21) | `240 240 243` (#F0F0F3) |
| `--surface-3` | hover de superfície, chips | `38 38 45` (#26262D) | `235 235 239` (#EBEBEF) |
| `--ink` | superfícies sempre-escuras (navbar, hero, auth aside) | `11 11 13` | `17 17 20` (#111114) |
| `--ink-fg` | texto sobre ink | `246 246 248` | `246 246 248` |
| `--border` | divisórias, contorno de card | `38 38 45` | `224 224 230` (#E0E0E6) |
| `--border-strong` | inputs, hover de borda | `58 58 67` | `200 200 208` (#C8C8D0) |
| `--fg` | texto principal | `246 246 248` | `17 17 20` |
| `--fg-muted` | texto secundário | `180 180 190` | `75 75 85` (#4B4B55) |
| `--fg-subtle` | metadados, placeholders | `138 138 150` | `110 110 122` (#6E6E7A) |
| `--primary` | fundo de CTA, estado ativo | `253 132 1` | `253 132 1` |
| `--primary-hover` | hover do CTA | `255 154 26` | `224 110 0` |
| `--primary-fg` | texto sobre primary | `11 11 13` | `11 11 13` |
| `--primary-text` | links / texto laranja | `255 154 26` (400) | `184 86 0` (700) |
| `--primary-soft` | fundo tonal (chip ativo, badge) | `61 28 0` (950) | `255 231 194` (100) |
| `--accent` | número de coleção, estrelas, marca | `255 222 33` | `128 108 0` (800) |
| `--accent-soft` | fundo tonal amarelo | `89 75 0` (900) | `255 245 191` (100) |
| `--flame` | favorito ativo, "hot", badge destaque | `255 56 56` (400) | `224 0 0` (600) |
| `--flame-soft` | fundo tonal vermelho | `77 0 0` (900) | `255 240 240` (50) |
| `--success` | | `34 197 94` | `21 128 61` |
| `--warning` | | `255 222 33` | `128 108 0` |
| `--danger` | erro, excluir | `255 56 56` | `224 0 0` |
| `--info` | | `96 165 250` | `37 99 235` |
| `--ring` | foco | `253 132 1` | `224 110 0` |
| `--overlay` | backdrop de modal | `0 0 0` (usar /70) | `17 17 20` (usar /50) |

**Contraste verificado (WCAG AA):**
- `--primary-fg` (#0B0B0D) sobre `--primary` (#FD8401): **7,9:1** ✅ — por isso o botão primário usa texto escuro. Texto branco sobre laranja (2,5:1) é **proibido**.
- `--fg-muted` sobre `--surface` nos dois temas: ≥ 7:1 ✅. `--fg-subtle`: ≥ 4,5:1 ✅.
- `--primary-text` light (#B85600) sobre branco: 4,8:1 ✅.
- `--accent` dark (#FFDE21) sobre #16161A: 13:1 ✅; light usa yellow-800 (5,2:1) ✅ — yellow-700 (2,9:1) é reprovado para texto.

## 5. Tipografia

Fontes via `next/font/google` (self-hosted, sem layout shift):

| Papel | Família | Pesos | Variável | Por quê |
|---|---|---|---|---|
| Display (títulos, números grandes, hero) | **Saira** (+ Saira Condensed para eyebrows) | 600, 700, 800 (+ itálico 800) | `--font-display` | Geometria técnica/motorsport, ecoa o wordmark itálico da logo |
| Texto (UI, corpo) | **Inter** | 400, 500, 600 | `--font-sans` | Legibilidade máxima em UI densa |
| Códigos (toy, collector `#001`, `8/10`, `1/64`) | **JetBrains Mono** | 500 | `--font-mono` | Algarismos tabulares; zeros à esquerda alinhados |

**Regra da identidade:** o título do hero e os números grandes (stats do dashboard, da coleção e do perfil) usam `font-display italic font-extrabold` (Saira 800 itálico) — referência direta à inclinação do "TOSAVE". Usar itálico **só** nesses casos (e no título das telas de auth).

### Escala

| Token | Tamanho / altura de linha | Tracking | Uso |
|---|---|---|---|
| `display-2xl` | `clamp(2.5rem, 6vw, 4.5rem)` / 1.0 | -0.02em | Título do hero |
| `display-xl` | `clamp(2rem, 4.5vw, 3.25rem)` / 1.05 | -0.02em | Título da página de detalhe |
| `display-lg` | 2.25rem / 1.1 | -0.01em | KPI do dashboard |
| `h1` | 1.75rem / 1.2 (mobile 1.5rem) | -0.01em | Título de página |
| `h2` | 1.375rem / 1.3 | 0 | Título de seção |
| `h3` | 1.125rem / 1.4 | 0 | Título de card/modal |
| `body-lg` | 1.0625rem / 1.6 | 0 | Descrição do carro |
| `body` | 0.9375rem / 1.55 | 0 | Padrão da UI |
| `body-sm` | 0.8125rem / 1.5 | 0 | Metadados |
| `caption` | 0.75rem / 1.4 | 0.01em | Legendas, helper text |
| `eyebrow` | 0.6875rem / 1.2, Saira Condensed 600, UPPERCASE | 0.14em | Marca · ano acima do título |

## 6. Espaçamento, grid e breakpoints

Base 4 px (escala padrão do Tailwind). Tokens adicionais: `4.5` (18px), `13` (52px), `18` (72px), `22` (88px), `30` (120px).

| Breakpoint | min-width | Gutter lateral | Colunas do grid de carros |
|---|---|---|---|
| (base) | 0 | 16 px | 2 |
| `xs` | 400 px | 16 px | 2 |
| `sm` | 640 px | 20 px | 3 |
| `md` | 768 px | 24 px | 3 |
| `lg` | 1024 px | 32 px | 4 |
| `xl` | 1280 px | 32 px | 4 |
| `2xl` | 1536 px | 40 px | 5 |

- **Container:** `max-w-[1440px] mx-auto px-4 sm:px-5 md:px-6 lg:px-8 2xl:px-10`.
- **Container de leitura** (auth, formulários, texto): `max-w-[640px]`.
- **Gap do grid de cards:** 12 px (base) → 16 px (`sm`) → 24 px (`lg`).
- **Ritmo vertical entre seções:** 40 px mobile, 64 px desktop.
- **Altura da navbar:** 56 px mobile, 64 px desktop. **Tab bar inferior** (mobile, colecionador): 64 px + `env(safe-area-inset-bottom)`.

## 7. Raio

"Bordas levemente arredondadas" — nada de pílulas gigantes nem cantos vivos.

| Token | Valor | Uso |
|---|---|---|
| `rounded-xs` | 4 px | badges, checkbox |
| `rounded-sm` | 6 px | chips, tags |
| `rounded-md` | 8 px | botões, inputs, selects |
| `rounded-lg` | 12 px | **cards**, imagens da galeria, popovers |
| `rounded-xl` | 16 px | modais, painel do hero, bottom sheet (só cantos superiores) |
| `rounded-full` | 9999 px | avatar, botão ícone de favorito, dots |

## 8. Sombra e elevação

No dark, elevação é comunicada por **superfície mais clara + borda**, não por sombra preta (invisível). Sombras são tokens por tema.

| Token | Dark | Light |
|---|---|---|
| `--shadow-card` | `0 0 0 1px rgb(38 38 45)` | `0 1px 2px rgb(17 17 20 / .06), 0 0 0 1px rgb(224 224 230)` |
| `--shadow-card-hover` | `0 0 0 1px rgb(253 132 1 / .45), 0 12px 32px -8px rgb(253 132 1 / .25)` | `0 0 0 1px rgb(253 132 1 / .5), 0 12px 28px -10px rgb(17 17 20 / .18)` |
| `--shadow-pop` (dropdown, popover) | `0 16px 40px -12px rgb(0 0 0 / .7), 0 0 0 1px rgb(58 58 67)` | `0 16px 40px -12px rgb(17 17 20 / .2), 0 0 0 1px rgb(224 224 230)` |
| `--shadow-modal` | `0 32px 80px -20px rgb(0 0 0 / .8)` | `0 32px 80px -20px rgb(17 17 20 / .3)` |
| `--shadow-glow` (CTA hero, favorito ativo) | `0 0 24px rgb(253 132 1 / .35)` | `0 0 20px rgb(253 132 1 / .25)` |

## 9. Movimento

| Token | Valor | Uso |
|---|---|---|
| `duration-fast` | 120 ms | hover de cor, press |
| `duration-base` | 200 ms | abrir popover, trocar tab |
| `duration-slow` | 320 ms | modal, bottom sheet, zoom da imagem do card |
| `ease-out-expo` | `cubic-bezier(0.22, 1, 0.36, 1)` | entradas |
| `ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | transições de layout |

- Card em hover: imagem `scale-[1.04]` em 320 ms, borda ganha `--shadow-card-hover`.
- Favoritar: coração faz "pop" (`scale 1 → 1.25 → 1`, 280 ms) e ganha `--shadow-glow` vermelho.
- Skeleton: shimmer 1,4 s linear infinito.
- `prefers-reduced-motion: reduce` → remover scale/shimmer, manter apenas fade de opacidade.

## 10. Z-index

| Token | Valor |
|---|---|
| `z-sticky` (FilterBar, barra de ações de formulário) | 30 |
| `z-navbar` / `z-tabbar` | 40 |
| `z-popover` (dropdown, select) | 50 |
| `z-modal` (inclui bottom sheet) | 60 |
| `z-toast` | 70 |

## 11. Estados de interação (regras globais)

| Estado | Regra |
|---|---|
| **Hover** (só `@media (hover: hover)`) | superfície sobe 1 nível (`surface` → `surface-3`); primary → `primary-hover`; cursor pointer |
| **Focus-visible** | `outline-none ring-2 ring-ring ring-offset-2 ring-offset-bg` — sempre visível no teclado, nunca removido |
| **Active / pressed** | `scale-[0.98]` em 120 ms |
| **Disabled** | `opacity-40 pointer-events-none`; `aria-disabled` quando precisar manter foco |
| **Loading** | spinner substitui o ícone à esquerda, label mantida, largura travada, `aria-busy="true"` |
| **Selected / ativo** | `bg-primary-soft text-primary-text border-primary/60` (chips, tabs, filtros) |
| **Erro (campo)** | borda `danger`, ícone `AlertCircle` à direita, mensagem `caption text-danger` abaixo, `aria-invalid` + `aria-describedby` |
| **Sucesso** | toast com borda-esquerda `success`; nunca bloquear o fluxo |

**Toasts** (canto inferior direito desktop; topo, abaixo da navbar, no mobile): 4 s, fecháveis, máximo 3 empilhados.

## 12. `tailwind.config.ts` e `globals.css`

A versão final e pronta para colar fica em **`handoff-forja.md`** (seções 2 e 3). É a fonte única, para evitar duas cópias divergentes. Resumo do mecanismo:
- Tokens semânticos são CSS variables com canais RGB (`--primary: 253 132 1`), expostos no Tailwind como `rgb(var(--primary) / <alpha-value>)`, e por isso `bg-primary/20` funciona.
- `:root` e `.dark` = tema dark (padrão); `.light` sobrescreve as variáveis; `.ink` força o conjunto dark em Navbar/Hero/Auth.
- `next-themes` com `attribute="class"` e `defaultTheme="dark"`.
- Container de página: classe `.page-container` (1440 px, gutters da tabela da §6).

## 13. Iconografia e imagem

- **Lucide**, `stroke-width 1.75`, tamanhos 16 (inline), 20 (padrão), 24 (navbar/tab bar).
- Ícones-chave: `Heart` (favorito/coleção), `Search`, `SlidersHorizontal` (filtros), `Share2` + ícone WhatsApp (SVG próprio, ver componentes), `Car`, `Layers` (séries), `Tag` (marcas), `Sparkles` (atributos), `Settings`, `LayoutDashboard`, `ImagePlus` (upload), `Hash` (collector).
- **Imagens de carros:** sempre dentro de um "palco" (`bg-card-stage`) — um gradiente radial sutil que dá sensação de estúdio fotográfico mesmo quando a foto tem fundo branco ou recorte. `object-contain` + `p-3` para fotos de blister/recorte; `object-cover` quando a foto ocupar o quadro (decisão por imagem não é possível — **padrão: `object-cover`**, ver pendência).
- **Placeholder sem imagem:** silhueta `Car` de Lucide 48 px em `fg-subtle/40` centralizada no palco. Nunca um quadrado cinza vazio.
- `next/image` com `sizes` corretos por breakpoint; `imagemThumb` nos cards, `imagemFull` + `CarImages` na galeria.

## 14. Voz e microcopy

- Português do Brasil, segunda pessoa informal ("sua coleção"), frases curtas.
- Verbos de ação nos botões: "Adicionar à coleção", "Salvar série", "Entrar".
- Números de coleção sempre com `#` e zeros à esquerda preservados: `#001`.
- **Empty states oficiais (texto exato, não alterar):**
  - Sem carros: **"Nenhuma miniatura disponível no momento."**
  - Sem conteúdos: **"Nenhum conteúdo disponível."**

## 15. Decisões registradas e pendências

Decisões aprovadas pelo Orquestrador (também registradas em `docs/ESPECIFICACAO.md`):

| # | Tema | Decisão | Onde aplicada |
|---|---|---|---|
| 1 | Perfil | Rota `/profile`; edita nome, e-mail e senha (senha exige a atual) | `telas/perfil.md` |
| 2 | Busca sem resultado | Título oficial "Nenhuma miniatura disponível no momento." + linha auxiliar "Tente outro termo ou limpe os filtros." | `telas/home.md`, `componentes.md` §9 |
| 3 | `isDefault` | Não é exclusivo: várias séries em destaque, com carrossel no hero | `telas/home.md`, `telas/admin-series.md` |
| 4 | `Brands.state` | Enum de situação: ativa · descontinuada · em análise. `active` = "Visível no site" | `telas/admin-marcas.md` |
| 5 | `/admin/settings` | Abas Geral + Usuários (listar, alterar role, alterar status) | `telas/admin-settings.md` |
| 6 | `imagemThumb` | Gerada pelo backend no upload; sem campo no formulário | `telas/admin-carros.md` |
| 7 | Sub-rotas admin | `/new` e `/[id]/edit` para carros, séries, marcas e atributos | `telas/README.md` (padrão de formulário) |
| 8 | Navbar/hero | Sempre ink nos dois temas | §2, `marca.md` |
| 9 | Logo light e favicon | Derivados da logo oficial (substituíveis) | `marca.md`, `_brand/` |

**Pendências abertas:**
1. **Campos da aba "Geral" de `/admin/settings`:** a aba existe, mas os campos não foram definidos (não há tabela de settings no modelo). O padrão visual já está pronto.
2. **Enquadramento de imagem** (`object-cover` vs `contain`) no CarCard: padrão `cover`. Revisar quando houver fotos reais.
