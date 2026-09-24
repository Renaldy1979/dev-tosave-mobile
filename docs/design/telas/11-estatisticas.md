# 11 — Estatísticas

| | |
|---|---|
| Rota | `app/(drawer)/estatisticas.tsx` → `/estatisticas` (item "Estatísticas" do menu; tela raiz com Header `root`) |
| Acesso | exige sessão |
| Tema | segue o tema (light/dark) |
| Dados (conceituais, o contrato é do Forja e do Alicerce) | `user_stats` (unidades, modelos, repetidos), `catalog_meta.totalCars`, `user_series_stats.owned` + `series.carCount`, `user_year_stats.owned` + `year_counts.carCount`. **Tudo contado no servidor**: nada de ler a coleção inteira no app. |
| Critério | enxuto: funciona, certo nos dois temas, safe area, textos oficiais, 44 pt, a11y, estados de loading/erro/vazio. Sem animação extra. |

Entradas:
- item **Estatísticas** do menu (`09-menu-drawer.md`);
- link **"Ver estatísticas"** na Coleção (`06-colecao.md`, logo abaixo do resumo).

## 1. Layout

```
┌───────────────────────────────┐
│ (≡)  Estatísticas             │  Header root, sem ação à direita
├───────────────────────────────┤
│ ┌─────────────┬─────────────┐ │  resumo: 4 StatTile em card surface rounded-lg (2×2)
│ │     379     │     375     │ │  display-xl font-display-black text-accent
│ │  UNIDADES   │   MODELOS   │ │  caption fg-muted uppercase
│ ├─────────────┼─────────────┤ │
│ │      4      │    3,7%     │ │
│ │  REPETIDOS  │ DO CATÁLOGO │ │  % do catálogo = modelos / total de carros
│ └─────────────┴─────────────┘ │
│                               │
│ Progresso por série           │  SectionHeader h2
│ [ Maior % | Nome ]            │  SegmentedControl de ordenação (2 opções)
│ ┌───────────────────────────┐ │
│ │[logo] HW J-Imports   8/12 │ │  SerieProgressRow
│ │ 40pt  ▓▓▓▓▓▓▓▓░░░░   67%  │ │  ProgressBar (10-series §B.3) + caption %
│ ├───────────────────────────┤ │
│ │[logo] Car Culture    3/10 │ │
│ │       ▓▓▓░░░░░░░░░   30%  │ │
│ └───────────────────────────┘ │
│  Ver todas as séries  ›       │  link primary-text → /series
│                               │
│ Por ano                       │  SectionHeader h2
│ ┌───────────────────────────┐ │
│ │ 2024              41/250  │ │  YearProgressRow
│ │ ▓▓░░░░░░░░░░░░░░░   16%   │ │
│ ├───────────────────────────┤ │
│ │ 2023              88/248  │ │
│ └───────────────────────────┘ │
└───────────────────────────────┘
```

- **Uma única `FlashList`** com os três blocos como itens de seção (resumo, cabeçalho de série, linhas de série, cabeçalho de ano, linhas de ano). Assim, centenas de séries não pesam. Gutter 16; seções separadas por 32 pt; `paddingBottom: insets.bottom + 24`.
- Pull-to-refresh recarrega tudo. Os números vêm de estatísticas mantidas no servidor e podem levar alguns segundos para refletir uma mudança recente na coleção; o refresh resolve.

## 2. Resumo (4 StatTiles)

| Tile | Valor | Observação |
|---|---|---|
| UNIDADES | soma das quantidades | toque: nenhum |
| MODELOS | carros distintos | toque: nenhum |
| REPETIDOS | modelos com quantidade > 1 | toque → `router.navigate("/colecao?dup=1")` |
| DO CATÁLOGO | `modelos / total de carros do catálogo` | formato pt-BR com 1 casa ("3,7%"); abaixo de 0,1% e maior que zero: "< 0,1%"; zero: "0%" |

- A11y: "379 unidades na coleção", "3,7 por cento do catálogo".

## 3. Progresso por série
- **Quais séries:** só as que o usuário **já começou** (possui ≥ 1 modelo). Listar as 357 com 0% só encheria a tela; o link **"Ver todas as séries"** leva à lista completa (`/series`).
- **Paginado no servidor** (20 por página) a partir de `user_series_stats`, que já traz `serieTitle`, `serieCarCount` e `pct` (milésimos, travado em 1000) desnormalizados (`ESPECIFICACAO-BACKEND.md` §15). O app não calcula nem ordena percentuais.
- **Ordenação** (SegmentedControl, padrão **Maior %**):
  - **Maior %:** percentual decrescente; empate por quem tem mais modelos, depois por título.
  - **Nome:** A–Z.
  - A escolha fica em memória na sessão.
- **`SerieProgressRow`:**
  - `Pressable` `min-h-16 px-3 py-2.5 gap-1.5`, pressed `bg-surface-3`, divisórias hairline `border-border` dentro de um card `bg-surface rounded-lg border`.
  - Linha 1: logo 40×40 (`contain`, silhueta sem logo) + título `body font-sans-medium` (1 linha) + `X/N` em `font-mono body-sm fg` à direita.
  - Linha 2: `ProgressBar` + % em `caption fg-muted` (inteiro, "67%").
  - Série completa: barra `accent` + `Badge accent sm` "Completa" no lugar do %.
- **Toque:** `router.push("/serie/{id}?filtro=faltam")`. Abre a série já no filtro **Faltam**; se ela estiver completa, abre em **Todos**.
- A11y: label "{título}, {X} de {N}, {p} por cento", hint "Mostra as miniaturas que faltam".

## 4. Por ano
- **Quais anos:** só os anos em que o usuário possui ≥ 1 modelo, do mais novo para o mais antigo.
- **`YearProgressRow`:** mesma estrutura da linha de série, sem logo. Ano em `h3 font-display` + `X/N` em `font-mono` + barra + %.
- **Toque:** `router.navigate("/busca?year={ano}")` (Busca filtrada pelo ano, que já existe).
- A11y: "{ano}: {X} de {N} miniaturas, {p} por cento".

## 5. Estados

| Estado | Visual |
|---|---|
| Carregando (> 150 ms) | 4 StatTile skeleton + 4 linhas skeleton em cada seção (mesma geometria) |
| Conteúdo | layout acima |
| **Coleção vazia** (0 modelos) | StatTiles com `0` e "0%" (números, não empty state). No lugar das duas seções, **um** `EmptyState kind="no-cars"` → **"Nenhuma miniatura disponível no momento."** + descrição "Adicione miniaturas à sua coleção para ver seu progresso." + ação "Explorar miniaturas" (`router.navigate("/busca")`) |
| Erro no resumo | `ErrorState sm` no lugar dos StatTiles; as outras seções seguem |
| Erro em "Progresso por série" ou "Por ano" | `ErrorState sm` no lugar da seção, com "Tentar novamente" só dela |
| Erro geral (tudo falhou) | `ErrorState lg` com "Tentar novamente" |
| Erro no refresh | mantém o conteúdo + Toast danger "Não foi possível atualizar." |

## 6. Mudanças em outras telas
- **Minha coleção** (`06-colecao.md`): abaixo do card de resumo, link **"Ver estatísticas"** (`body-sm font-sans-medium primary-text` + `ChevronRight` 16, `min-h-11`, alinhado à direita) → `router.navigate("/estatisticas")`. Some quando a coleção está vazia (o resumo também some).
- **Menu** (`09-menu-drawer.md`): item **Estatísticas** (ícone `ChartColumn`) entre Minha coleção e Perfil.

## 7. Critérios de aceite
- [ ] Resumo com unidades, modelos, repetidos e % do catálogo (modelos / total de carros), números do servidor.
- [ ] Progresso por série só com as séries começadas, logo, X/N, barra e %; ordena por Maior % ou por Nome; tocar abre a série em Faltam.
- [ ] Por ano com X/N e barra, do mais novo para o mais antigo; tocar abre a Busca filtrada pelo ano.
- [ ] Coleção vazia mostra zeros + empty state oficial com "Explorar miniaturas".
- [ ] Loading, erro por seção e erro geral com os textos oficiais.
- [ ] Acesso pelo menu e pelo link "Ver estatísticas" da Coleção.
- [ ] 44 pt de toque, certo nos temas light e dark, safe area, sem animação extra, sem ler a coleção inteira no app.
