# 06 — Coleção

| | |
|---|---|
| Rota | `app/(tabs)/colecao.tsx` → `/colecao` (tab **Coleção**) |
| Params | `q` (busca dentro da coleção), `dup=1` (apenas repetidos) |
| Acesso | **exige sessão**. Sem sessão, o toque na tab abre o login em modal (`next=/colecao`) e a tab não troca; por deep link, a tela mostra o `LoginGate` (componentes §C.16) |
| Dados | `collection.list({ q, duplicatesOnly })`, `collection.summary()`, `collection.setQuantity`, `collection.remove` |

Os itens do usuário, com adicionar/remover unidades e filtro de **repetidos** (`quantity > 1`). Adicionar um carro novo à coleção acontece pelo coração (Home, Busca, detalhe); aqui se gerencia o que já está nela.

## 1. Layout

```
┌───────────────────────────────┐
│ Minha coleção                 │  Header large: h1 + subtítulo
│ 48 miniaturas · 41 modelos    │  body-sm fg-muted (colapsa ao rolar)
│                               │
│ ┌─────────┬─────────┬───────┐ │  resumo: 3 StatTile em card surface rounded-lg
│ │   48    │   41    │   7   │ │  display-xl font-display-black text-accent
│ │ ITENS   │ MODELOS │REPETID│ │  caption fg-muted uppercase
│ └─────────┴─────────┴───────┘ │  (tocar em REPETIDOS liga o filtro)
│                               │
│ [🔍 Buscar na coleção       ] │  SearchBar input (sticky ao colapsar)
│ [Todos] [Repetidos · 7]  ⇅ Recentes │ SegmentedControl 2 opções + ordenação (ghost sm)
│                               │
│ ┌───────────┐ ┌───────────┐   │  grid 2 colunas de CarCard collection
│ │#001 [−2+] │ │#024 [−1+] │   │  stepper glass no canto
│ │  [img]    │ │  [img]    │   │
│ │MATTEL·2024│ │MATTEL·2023│   │
│ │'71 Datsun │ │Nissan Sky…│   │
│ │Repetido ×2│ │J-Imports  │   │  Badge flame quando quantity > 1
│ └───────────┘ └───────────┘   │
├───────────────────────────────┤
│ TabBar (Coleção ativo · 48)   │
└───────────────────────────────┘
```

- **Itens** = soma das quantidades; **Modelos** = carros distintos; **Repetidos** = carros com `quantity > 1`.
- `Todos | Repetidos` é o filtro de repetidos (SegmentedControl, sincronizado com `dup=1`). O contador do segmento "Repetidos" usa o número de modelos repetidos.
- Ordenação (BottomSheet `dynamic` com opções em ListRow + `Check`): **Adicionados recentemente** (padrão, `createdAt` desc), **Nome A–Z**, **Ano (mais novo)**, **Mais unidades**. Guardada em memória de sessão.
- Busca local por nome, toy e collector, debounce 300 ms.

## 2. Hierarquia
1. Números da coleção (orgulho do colecionador, Saira itálica em amarelo)
2. Busca e filtro Todos/Repetidos
3. Grid de itens com quantidade

## 3. Interações

| Ação | Resultado |
|---|---|
| `+` no stepper | `setQuantity(n+1)` otimista; número desliza para cima; haptic selection; máximo 99 |
| `−` com quantity > 1 | `setQuantity(n-1)` otimista |
| `−` com quantity = 1 | ConfirmDialog "Remover da coleção?" → confirmar remove o card (fade + colapso de layout 200 ms com `LinearTransition`), haptic Warning, Toast "Removida da sua coleção." com ação **"Desfazer"** (4 s; desfazer recria com a mesma quantidade) |
| Pressão longa no card | menu contextual em BottomSheet `dynamic`: "Ver detalhes", "Compartilhar no WhatsApp", "Remover da coleção" (danger) |
| Tocar no card | `router.push("/car/{id}")` |
| Tocar em "REPETIDOS" no resumo | liga `dup=1` |
| Pull-to-refresh | recarrega lista e resumo |

Com `dup=1`, se um item baixa para quantity 1 ele continua visível até o próximo refresh ou troca de filtro (evita o card sumir sob o dedo), com o badge "Repetido" removido.

## 4. Navegação
- Tab Coleção; badge da tab = total de itens.
- Toque na tab ativa rola ao topo.
- Detalhe via push; ao voltar, rolagem e filtros preservados, e alterações feitas no detalhe já refletidas (store compartilhado).

## 5. Estados

| Estado | Visual |
|---|---|
| **Carregando** (> 150 ms) | resumo com 3 StatTile skeleton + `CarGridSkeleton` |
| **Conteúdo** | layout acima |
| **Coleção vazia** (nenhum item) | resumo e controles **ocultos**; `EmptyState kind="no-cars" size="lg"` → **"Nenhuma miniatura disponível no momento."** + descrição "Toque no coração de uma miniatura para começar sua coleção." + ação `Button primary` "Explorar miniaturas" → `router.push("/busca")` |
| **Nenhum repetido** (`dup=1` sem itens) | resumo e controles visíveis; no lugar do grid `EmptyState kind="no-cars"` → **"Nenhuma miniatura disponível no momento."** + ação "Ver todos" (desliga o filtro) |
| **Busca sem resultado** | `EmptyState kind="no-cars"` + **"Tente outro termo ou limpe os filtros."** + ação "Limpar busca" |
| **Erro ao carregar** | `ErrorState lg` com "Tentar novamente" (resumo oculto) |
| **Erro em +/−/remover** | reverte + Toast danger "Não foi possível atualizar sua coleção." |
| **Erro no refresh** | mantém conteúdo + Toast "Não foi possível atualizar." |

## 6. Acessibilidade
- StatTiles lidos como "48 itens na coleção", etc.
- Stepper `adjustable`: deslizar para cima/baixo com VoiceOver altera a quantidade; ao chegar a 1, "diminuir" abre a confirmação.
- Toast de "Desfazer" com ação acessível e tempo estendido para 8 s quando o leitor de tela está ativo.

## 7. Critérios de aceite
- [ ] Lista os itens do usuário com quantidade.
- [ ] Adicionar e remover unidades; remover a última pede confirmação e permite desfazer.
- [ ] Filtro "Repetidos" mostra só `quantity > 1` e reflete em `dup=1`.
- [ ] Números do resumo e badge da tab sempre consistentes com a lista.
- [ ] Empty state oficial com CTA para explorar quando a coleção está vazia.
