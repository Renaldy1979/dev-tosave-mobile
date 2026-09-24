# 10 — Séries (lista e tela da série)

| | |
|---|---|
| Rotas | **Lista:** `app/(drawer)/series.tsx` → `/series` (item "Séries" do menu, tela raiz com Header `root`) · **Série:** `app/serie/[id].tsx` → `/serie/{id}?filtro=todos\|colecao\|faltam` (stack sobre o drawer, com voltar, como o Detalhe do carro) |
| Acesso | exige sessão |
| Tema | segue o tema (light/dark) |
| Dados (conceituais, o contrato é do Forja e do Alicerce) | `series` (título, logo `imageFileId`, `carCount`, `isDefault`), `cars` por série ordenados por `seriePositionNum`, itens da coleção do usuário na série, `user_series_stats.owned` |
| Critério | enxuto: funciona, certo nos dois temas, safe area, textos oficiais, 44 pt, a11y, estados de loading/erro/vazio. Sem animação extra. |

Entradas:
- item **Séries** do menu (`09-menu-drawer.md`);
- **"Ver tudo"** das séries em destaque na Home, que passa a abrir `/series` (antes abria a Busca com o filtro de série);
- linha de série em **Estatísticas** (`11-estatisticas.md`), que abre `/serie/{id}?filtro=faltam`.

> **Texto de contagem:** a interface usa "miniatura(s)", a voz do app (DS §13), e não "carros": "12 miniaturas", "Você tem 8 de 12".

---

## A. Lista de séries (`/series`)

### A.1 Layout

```
┌───────────────────────────────┐
│ (≡)  Séries                   │  Header root (09 §1), sem ação à direita
├───────────────────────────────┤
│ [🔍 Buscar série            ✕]│  SearchBar input, placeholder "Buscar série"
│ 357 séries                    │  body-sm fg-muted (vira "N resultados" com busca)
│ ┌───────────────────────────┐ │
│ │ [logo]  HW J-Imports    › │ │  SerieRow (72 pt)
│ │  56pt   12 miniaturas     │ │
│ │         Você tem 8        │ │  caption accent (só se tiver ≥ 1)
│ ├───────────────────────────┤ │
│ │ [logo]  Car Culture     › │ │
│ │         10 miniaturas     │ │
│ └───────────────────────────┘ │
│ …                             │  rolagem infinita, 30 por página
└───────────────────────────────┘
```

- **Uma única `FlashList`**; SearchBar e contagem vão no `ListHeaderComponent`. Gutter de 16 pt; `paddingBottom: insets.bottom + 24`.
- Ordem: **alfabética por título** (A–Z). As séries em destaque (`isDefault`) não mudam de posição e ganham um `Badge flame sm` "Em destaque" depois do título.
- Busca: debounce de 300 ms sobre o título, **por trecho e sem diferenciar maiúsculas** ("J-Imp", "j-imp" e "imports" acham "HW J-Imports"). No servidor: `Query.contains('title', termo)` (`ESPECIFICACAO-BACKEND.md` §15). Rolar fecha o teclado (`keyboardDismissMode="on-drag"`).

### A.2 `SerieRow` (card compacto)
- `Pressable` `flex-row items-center gap-3 min-h-[72px] px-3 py-2 rounded-lg bg-surface border border-border`, pressed `bg-surface-3`; 8 pt entre linhas.
- **Logo:** 56×56 com o mesmo tratamento do SeriesCard atual. Logos são 150×150 com transparência: `CarImage` com `contentFit="contain"` e fundo da superfície do card. Sem logo ou com falha: silhueta padrão do `CarImage`.
- **Título:** `body font-sans-semibold fg`, até 2 linhas.
- **Contagem:** `body-sm fg-muted` "N miniaturas" ("1 miniatura" no singular).
- **Posse:** "Você tem X" em `caption` `text-accent font-sans-semibold`, só quando X ≥ 1 (dado de `user_series_stats`). Sem posse, a linha não aparece.
- `ChevronRight` 18 `fg-subtle` à direita.
- A11y: `accessibilityRole="button"`, label "{título}, {N} miniaturas" + ", você tem {X}" quando houver.

### A.3 Estados

| Estado | Visual |
|---|---|
| Carregando (> 150 ms) | 8 linhas skeleton na mesma geometria (quadrado 56 + 2 linhas) |
| Conteúdo | lista |
| Carregando mais | 2 linhas skeleton no fim |
| Busca sem resultado | `EmptyState kind="no-content"` → **"Nenhum conteúdo disponível."** + descrição "Tente outro nome." + ação "Limpar busca" |
| Nenhuma série no catálogo | `EmptyState kind="no-content" size="lg"` → **"Nenhum conteúdo disponível."**, sem ação |
| Erro (1ª página) | `ErrorState lg` com "Tentar novamente" |
| Erro na próxima página | rodapé "Não foi possível carregar mais." + `Button outline sm` "Tentar novamente" (44 pt de toque) |
| Pull-to-refresh | recarrega a 1ª página; em erro, mantém a lista + Toast danger "Não foi possível atualizar." |

---

## B. Tela da série (`/serie/{id}`)

### B.1 Layout

```
┌───────────────────────────────┐
│ (‹)  HW J-Imports             │  Header stack: voltar + título h3 (1 linha)
├───────────────────────────────┤
│        ┌────────┐             │
│        │ [logo] │             │  logo 96 pt, contain (sem logo: silhueta)
│        └────────┘             │
│        HW J-Imports           │  h1 font-display fg, centralizado, até 2 linhas
│   Você tem 8 de 12            │  body fg-muted; "8" em font-display-black text-accent
│   ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░  67%    │  ProgressBar (§B.3) + caption %
│                               │
│ [ Todos 12 | Na coleção 8 | Faltam 4 ] │  SegmentedControl (3 opções, com contagem)
│                               │
│ ┌───────────┐ ┌───────────┐   │  grid do CarCard (igual à Home)
│ │#001  1/12 ♥│ │#024  2/12 ♡│  │  ♥ preenchido = na coleção
│ │  [img]    │ │  [img]    │   │
│ └───────────┘ └───────────┘   │
└───────────────────────────────┘
```

- **Uma única `FlashList`** (grid), com o bloco de cabeçalho e o SegmentedControl no `ListHeaderComponent`. Gutter 16, gap 12 (DS §6).
- **Paginada por cursor**, 30 por página (a maior série, First Editions, tem 520 carros). Os dados vêm da Function `serie-progress`, que devolve os carros na ordem da posição, com `owned`/`quantity`, o filtro Todos / Na coleção / Faltam e as contagens da série inteira para os rótulos do segmento (`ESPECIFICACAO-BACKEND.md` §9 e §15). Carregando mais: 2 `CarCardSkeleton`; erro na próxima página: rodapé "Não foi possível carregar mais." + "Tentar novamente".
- **Ordenação: pela posição na série** (`seriePositionNum` crescente). Carros sem posição vão ao final, por título. Não há outra ordenação nesta tela.
- **Marcação "na coleção":** o próprio `FavoriteButton` do CarCard (coração preenchido flame = na coleção). O coração funciona como em qualquer grid: adiciona ou remove, com o mesmo comportamento da Home.
- **Segmento** (sincronizado com o param `filtro`):
  - **Todos**: todos os N carros da série.
  - **Na coleção**: só os que o usuário tem.
  - **Faltam**: só os que o usuário **não** tem.
  - As contagens no rótulo ("Faltam 4") seguem o estado atual. Se o usuário adiciona um carro estando em "Faltam", o card **continua visível** até trocar de segmento ou atualizar (evita o card sumir sob o dedo), já com o coração ativo.
- Série sem descrição: nada. Com descrição: `body-sm fg-muted`, até 3 linhas, abaixo da contagem, **sem** "ler mais" (fase 1.5).
- Série completa (X = N): a linha de posse vira "Você tem todas as 12" e aparece um `Badge accent` "Série completa" abaixo da barra.

### B.2 Navegação

| Ação | Destino |
|---|---|
| Voltar (header, gesto, back do Android) | `router.back()`; sem histórico (deep link) → `router.replace("/series")` |
| Tocar em um CarCard | `router.push("/car/{id}")` |
| Entrar com `?filtro=faltam` (vindo das Estatísticas) | abre já no segmento **Faltam** |

### B.3 ProgressBar (componente novo, simples)
- Trilho `h-1.5` (6 pt) `rounded-full bg-surface-3`; preenchimento `bg-primary` com largura X/N; em 100%, `bg-accent`.
- Sem animação (a largura é aplicada direto).
- A11y: `accessibilityRole="progressbar"`, `accessibilityValue={{ min: 0, max: N, now: X }}`, label "{X} de {N}".
- Reutilizado em `11-estatisticas.md`.

### B.4 Estados

| Estado | Visual |
|---|---|
| Carregando (> 150 ms) | cabeçalho skeleton (quadrado 96 + 2 linhas + barra) + `CarGridSkeleton` |
| Conteúdo | layout acima |
| Série sem carros (N = 0) | cabeçalho + `EmptyState kind="no-cars"` → **"Nenhuma miniatura disponível no momento."**, sem segmento |
| "Na coleção" vazio | `EmptyState kind="no-cars"` → **"Nenhuma miniatura disponível no momento."** + descrição "Você ainda não tem miniaturas desta série." + ação "Ver as que faltam" (troca para Faltam) |
| "Faltam" vazio (série completa) | `EmptyState kind="no-cars"` → **"Nenhuma miniatura disponível no momento."** + descrição "Você tem todas as miniaturas desta série." |
| Série não encontrada (id inválido) | Header stack + `EmptyState kind="no-content" size="lg"` → **"Nenhum conteúdo disponível."** + ação "Ver todas as séries" (`router.replace("/series")`) |
| Erro ao carregar | Header stack + `ErrorState lg` com "Tentar novamente" |
| Erro no coração | mesmo tratamento da Home: reverte + Toast danger "Não foi possível atualizar sua coleção." |
| Pull-to-refresh | recarrega cabeçalho, contagens e lista; em erro, mantém o conteúdo + Toast danger "Não foi possível atualizar." |

### B.5 Acessibilidade
- Título da série (h1) com `accessibilityRole="header"`.
- Linha de posse lida como "Você tem 8 de 12 miniaturas desta série, 67 por cento".
- SegmentedControl: `radiogroup`/`radio`, com a contagem no label ("Faltam, 4 miniaturas").
- CarCard com a label de sempre (componentes §4).

---

## C. Mudanças em outras telas
- **Home** (`03-home.md`): "Ver tudo" das séries em destaque → `router.navigate("/series")`. O toque num SeriesCard em destaque passa a abrir `/serie/{id}`, a tela da série, no lugar da Busca filtrada.
- **Menu** (`09-menu-drawer.md`): item **Séries** (ícone `Layers`) entre Buscar e Minha coleção.
- **Busca**: sem mudança. O filtro por série no FilterSheet continua existindo.

## D. Critérios de aceite
- [ ] Lista das 357 séries, paginada (30 por página), em ordem alfabética, com busca por nome.
- [ ] Linha com logo (contain) ou silhueta, título, "N miniaturas" e, quando houver, "Você tem X".
- [ ] Tela da série com logo, título, "Você tem X de N", barra e segmento Todos / Na coleção / Faltam.
- [ ] Grid igual ao da Home, ordenado pela posição na série, com o coração marcando o que está na coleção.
- [ ] `?filtro=faltam` abre já em Faltam.
- [ ] Estados de loading, erro e vazio com os textos oficiais.
- [ ] 44 pt de toque, certo nos temas light e dark, safe area, sem animação extra.
