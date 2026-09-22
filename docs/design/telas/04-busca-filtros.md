# 04 — Busca e filtros

| | |
|---|---|
| Rota | `app/(tabs)/busca.tsx` → `/busca` (tab **Buscar**) |
| Params | `q` (texto), `year` (lista `2024,2023`), `serie` (id), `brand` (id), `attr` (lista de ids), `focus=1` (foca o campo), `open=serie\|brand\|year\|attr` (abre o FilterSheet na seção) |
| Acesso | **público** (visitante ou logado); coração nos cards pede login se não houver sessão |
| Dados | `cars.list(filtros)`, `cars.count(filtros)`, `cars.years()`, `series.list()`, `brands.list()`, `attributes.list()` |

Tela dedicada de descoberta: busca por **nome ou código toy** e filtros por **ano, série, marca e atributos**.

## 1. Layout

```
┌───────────────────────────────┐
│ Buscar                        │  Header large (título colapsa ao rolar)
│ [🔍 Buscar por nome ou código ✕]│ SearchBar input (sticky, fica na barra ao colapsar)
│ [⚙ Filtros ②] [Ano ▾] [Série: J-Imports ✕] [Marca ▾] [Atributos · 2 ▾] [Limpar] │
│                               │  FilterChipsRow (scroll horizontal, sticky abaixo da busca)
│ 312 miniaturas                │  body-sm fg-muted (resultado ao vivo)
│ ┌───────────┐ ┌───────────┐   │
│ │  CarCard  │ │  CarCard  │   │  grid 2 colunas (igual à Home)
│ └───────────┘ └───────────┘   │
│ …                             │
├───────────────────────────────┤
│ TabBar (Buscar ativo)         │
└───────────────────────────────┘
```

### 1.1 Estado inicial (sem termo e sem filtro)
Em vez do grid completo repetindo a Home, a tela sugere caminhos:

```
│ BUSCAS RECENTES        Limpar │  eyebrow + ghost sm (só se houver)
│ ↺ datsun                    ✕ │  ListRow compacta (44 pt), até 5 itens, AsyncStorage
│ ↺ HKJ42                     ✕ │
│                               │
│ EXPLORAR POR SÉRIE            │  chips grandes (h-11) das séries, até 8 + "Ver todas"
│ [J-Imports] [Car Culture] …   │
│                               │
│ EXPLORAR POR MARCA            │  idem para marcas
│ [Mattel] [Mini GT] …          │
│                               │
│ Todas as miniaturas     →     │  Button outline fullWidth → mostra o grid sem filtro
```

Tocar numa série/marca aplica o filtro (params) e mostra os resultados.

## 2. Hierarquia
1. Campo de busca (foco imediato quando vem da Home)
2. Filtros ativos (visíveis, removíveis com 1 toque)
3. Contagem de resultados
4. Grid

## 3. Comportamento da busca
- Busca ao vivo com debounce de **300 ms**; `onSubmit` busca na hora e grava em recentes (termos com ≥ 2 caracteres, sem duplicar, máx. 5).
- Termo em `q` via `router.setParams` (sem empilhar histórico).
- **Código toy:** se o termo for alfanumérico, sem espaço e com ≥ 4 caracteres, o service prioriza correspondência exata de `toy`; na UI, o primeiro resultado exato aparece como `CarCard row` destacado com o rótulo "Código exato" (Badge primary) acima do grid.
- Busca também aceita `collector` com ou sem `#` (ex.: `#001`, `001`).
- Rolar a lista fecha o teclado (`keyboardDismissMode="on-drag"`).

## 4. Filtros
- `FilterChipsRow` + `FilterSheet` (componentes §12). Dimensões: **Ano** (multi), **Série** (única), **Marca** (única), **Atributos** (multi).
- Rascunho no sheet; aplica ao tocar "Ver N resultados" (conta ao vivo via `cars.count`).
- Chip com filtro ativo mostra o valor e um `X` para remover direto.
- "Limpar" (chip ou footer) remove todos os filtros, mantém o termo digitado.
- Filtros e termo combinam (AND). Anos e atributos entre si: OR para ano, AND para atributos (o carro precisa ter todos os atributos marcados).

## 5. Navegação

| Ação | Destino |
|---|---|
| Tocar em CarCard | `router.push("/car/{id}")`; ao voltar, termo, filtros e rolagem estão preservados |
| Vir da Home com `focus=1` | foca o SearchBar e abre o teclado; o param é removido após o foco |
| Vir com `serie={id}` | já mostra os resultados filtrados, chip "Série: …" ativo |
| Vir com `open=serie` | abre o FilterSheet na seção Série |
| Tocar em Buscar com a tela ativa | 1º toque rola ao topo; 2º toque foca o campo |
| Back do Android | fecha o sheet; senão, desfoca o campo; senão, volta à tab anterior |

## 6. Estados

| Estado | Visual |
|---|---|
| **Inicial** | Seção 1.1 (recentes + explorar). Séries/marcas carregando: 6 chips skeleton por bloco. |
| **Buscando** (> 150 ms) | `CarGridSkeleton`; contagem vira skeleton. Resultado anterior some (não mostrar resultado velho sob termo novo). |
| **Resultados** | contagem "312 miniaturas" ("1 miniatura" no singular) + grid com paginação infinita (20 por página). |
| **Sem resultado** | `EmptyState kind="no-cars"` → **"Nenhuma miniatura disponível no momento."** + descrição **"Tente outro termo ou limpe os filtros."** + ação "Limpar filtros" (só se houver filtro; senão sem ação). |
| **Sem opções numa dimensão do filtro** (ex.: nenhuma marca) | na seção do FilterSheet: `EmptyState kind="no-content" size="sm"` → **"Nenhum conteúdo disponível."**; o chip da dimensão fica desabilitado na barra. |
| **Sem séries/marcas no estado inicial** | o bloco "Explorar por …" correspondente some. |
| **Erro na busca** | `ErrorState lg` no lugar do grid; "Tentar novamente" repete a mesma consulta. Chips e termo continuam editáveis. |
| **Erro ao carregar opções de filtro** | na seção do sheet: `ErrorState sm` com "Tentar novamente". |
| **Erro na contagem ao vivo** | botão do footer volta a "Ver resultados" (sem número), segue funcional. |

## 7. Acessibilidade
- `SearchBar` com `accessibilityRole="search"`.
- Mudança da contagem anunciada (`accessibilityLiveRegion="polite"` / `announceForAccessibility`) depois do debounce: "312 miniaturas encontradas".
- Chip removível: label "Remover filtro Série J-Imports".

## 8. Critérios de aceite
- [ ] Busca por nome, por `toy` e por `collector` (com zeros à esquerda).
- [ ] Filtros por ano, série, marca e atributos, combináveis, refletidos nos params.
- [ ] Voltar do detalhe restaura termo, filtros e rolagem.
- [ ] Empty state oficial + linha auxiliar em busca sem resultado.
- [ ] "Nenhum conteúdo disponível." quando uma dimensão de filtro não tem opções.
- [ ] Listas de opções longas mostram 8 primeiros + "Ver todos (N)".
