# 03 — Home

| | |
|---|---|
| Rota | `app/(tabs)/index.tsx` → `/` (tab **Início**) |
| Acesso | **público** (visitante ou logado) |
| Tema | topo ink nos dois temas; resto segue o tema |
| Dados | `series.list({ featured: true })`, `cars.list({ page, pageSize: 20 })`, `collection` store (estado do coração), `auth` (nome/avatar) |

Objetivo: vitrine. Mostrar as séries em destaque, dar acesso imediato à busca e exibir o grid de miniaturas com imagens dominantes.

## 1. Layout

```
┌───────────────────────────────┐ ─┐
│ [LOGO 96]                (AS) │  │ HomeHeader ink: logo + Avatar 32 (→ Perfil) ou "Entrar" sem sessão; insets.top
│                               │  │
│ Olá, Ana                      │  │ body-sm ink-fg/60
│ O que vamos garimpar hoje?    │  │ h2 font-display ink-fg
│ [🔍 Buscar por nome ou código]│  │ SearchBar mode=trigger surface=ink
│                               │  │ faixa ink (sempre escura)
│ SÉRIES EM DESTAQUE   Ver tudo │  │ eyebrow ink-fg/60 + link primary
│ ┌──────────────┐┌───────      │  │ FeaturedSeriesCarousel (SeriesCard 280×160)
│ │  HW J-Imports ││ Car Cul    │  │
│ │  12 miniaturas││            │  │
│ └──────────────┘└───────      │  │
│                               │  │ base da faixa: linha reta de
├───────────────────────────────┤ ─┘ 2 pt de gradiente flame com 30% de opacidade
│ Miniaturas         1.240 itens│  SectionHeader h2 + contagem body-sm fg-muted
│ ┌───────────┐ ┌───────────┐   │
│ │#001     ♡ │ │#024     ♥ │   │  grid 2 colunas de CarCard grid
│ │  [img]    │ │  [img]    │   │
│ │MATTEL·2024│ │MATTEL·2023│   │
│ │'71 Datsun │ │Nissan Sky…│   │
│ └───────────┘ └───────────┘   │
│ …                             │  rolagem infinita
│        Você viu tudo.         │  caption fg-subtle, no fim
├───────────────────────────────┤
│ TabBar (Início ativo)         │
└───────────────────────────────┘
```

- Uma única lista rolável: `FlashList` com `numColumns` do `useGridColumns()` e `ListHeaderComponent` = faixa ink + SectionHeader. A faixa ink rola junto com o conteúdo (não é sticky).
- Ao rolar além da faixa ink, uma barra compacta aparece no topo (fade 200 ms): `bg-ink/95` + blur, logo 72 pt à esquerda e IconButton `Search` à direita (leva à Busca). Evita perder o acesso à busca no meio do grid.
- Saudação: primeiro nome do usuário. Visitante ou sem nome: só "O que vamos garimpar hoje?".
- Gutter 16, gap 12, `paddingBottom` = altura da TabBar + 24.

## 2. Hierarquia
1. Busca rápida (atalho mais usado)
2. Séries em destaque (vitrine editorial; várias séries podem ser destaque, `isDefault`)
3. Grid de miniaturas (conteúdo principal, imagens dominantes)

## 3. Componentes
HomeHeader (Logo sm + Avatar) · SearchBar `trigger` · SectionHeader · FeaturedSeriesCarousel + SeriesCard · CarCard `grid` · FavoriteButton · Skeletons · EmptyState · ErrorState · Toast.

**SeriesCard na Home:** imagem da série (`imagem`), título, contagem de miniaturas da série ("12 miniaturas", se o service devolver), Badge flame "Em destaque". Sem imagem: palco `surface-2` com `Layers` 40 pt e o título.

## 4. Navegação

| Ação | Destino |
|---|---|
| Tocar na SearchBar | `router.push("/busca?focus=1")` (troca para a tab Buscar com o campo focado) |
| Tocar em SeriesCard | `router.push("/busca?serie={id}")` (Busca filtrada pela série) |
| "Ver tudo" das séries | `router.push("/busca")` com o FilterSheet aberto na seção Série (`?open=serie`) |
| Tocar em CarCard | `router.push("/car/{id}")` |
| Coração no card | com sessão: toggle da coleção (otimista, ver componentes §13), sem sair da tela. Sem sessão: abre o login em modal e, depois de entrar, o carro é adicionado |
| Avatar | `router.push("/perfil")` |
| "Entrar" (visitante) | `router.push("/login")` (modal; ao entrar, volta à Home) |
| Tocar em Início com a Home ativa | rola ao topo |

## 5. Estados

| Estado | Faixa de séries | Grid |
|---|---|---|
| **Carregando** (> 150 ms) | `SeriesRailSkeleton` | `CarGridSkeleton` (6 cards); contagem vira skeleton 60 pt |
| **Conteúdo** | carrossel | grid, 20 por página |
| **Carregando mais** | — | 2 `CarCardSkeleton` no fim da lista (`onEndReachedThreshold 0.6`) |
| **Fim da lista** | — | "Você viu tudo." |
| **Pull-to-refresh** | recarrega séries e página 1 em paralelo; `RefreshControl tintColor=primary`, `progressViewOffset` abaixo do inset | |
| **Vazio: sem séries em destaque** | **a faixa inteira de séries some** (título incluso); a faixa ink fica só com saudação e busca | — |
| **Vazio: sem carros** | — | `EmptyState kind="no-cars" size="lg"` → **"Nenhuma miniatura disponível no momento."**, sem ação; contagem oculta |
| **Erro: séries** | `ErrorState sm` dentro da faixa ink (texto `ink-fg`), botão "Tentar novamente" recarrega só as séries | grid segue normal |
| **Erro: carros (1ª página)** | — | `ErrorState lg` no lugar do grid |
| **Erro: próxima página** | — | rodapé com "Não foi possível carregar mais." + Button `outline sm` "Tentar novamente" |
| **Erro no refresh** | mantém o conteúdo atual + Toast danger "Não foi possível atualizar." | |

Por que as séries somem em vez de mostrar "Nenhum conteúdo disponível.": a faixa é vitrine opcional; um bloco vazio no topo da Home parece quebrado. O texto oficial `no-content` é usado nos lugares onde o usuário pediu aquela lista (ex.: seção Série do FilterSheet).

## 6. Acessibilidade
- Faixa de séries: `accessibilityRole="list"` com label "Séries em destaque".
- Cada CarCard com label completa (componentes §4).
- A barra compacta que aparece ao rolar não rouba o foco do leitor de tela.

## 7. Critérios de aceite
- [ ] Funciona completa sem login; header mostra "Entrar" para visitante.
- [ ] Topo ink também no tema light; logo `logo.png`.
- [ ] Busca rápida leva à tab Buscar com teclado aberto.
- [ ] Várias séries em destaque aparecem no carrossel com snap.
- [ ] Grid de 2 colunas em celular, sem saltos ao carregar (skeleton com mesma geometria).
- [ ] Empty state oficial exibido quando o service retorna 0 carros.
- [ ] Coração atualiza o badge da tab Coleção na hora.
