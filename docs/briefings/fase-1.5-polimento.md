# Fase 1.5 — Polimento (backlog)

Itens das specs de tela e das revisões de design que **não bloqueiam** a fase 1. O critério está em `docs/ESPECIFICACAO-MOBILE.md`, em "Critério de pronto da fase 1". Nada aqui entra antes da fase 1 estar entregue.

## Da revisão do lote 01 (`revisao-design-lote-01.md`)

Pendências que o Forja registrou como evolução em `lote-02-revisao-design.md`:

- TabBar 100% custom (spec §6):
  - blur ink/85
  - indicador flame 16×2
  - ícones ativos com fill
  - teto "99+"
  - tocar em Início rola ao topo
- Button: o loading deve travar a largura.
- Onboarding:
  - Dimensions fora do módulo
  - back do Android por slide
  - parallax
- Home: barra compacta ao rolar (logo 72 + IconButton Search).
- Os itens de polimento 25–34 que não foram aplicados.

## Da revisão do lote 02 (`revisao-design-lote-02.md`)

- **9:**
  - Buscas recentes
  - títulos "EXPLORAR POR" some com o bloco vazio
  - "Ver todas" das séries
- **10:** o FilterSheet abre rolado até a seção tocada.
- **11:** FilterSheet com os "8 primeiros + Ver todos (N)".
- **12:**
  - params `focus`/`open` com a tab já montada
  - limpar os params
  - 2º toque na tab Buscar foca o campo
- **13:** Header `large` que colapsa; SearchBar e chips sticky.
- **17:**
  - sequência de headers do detalhe
  - skeleton com prévia do card

  (O texto de erro oficial é fase 1.)
- **19:**
  - alturas da ActionBar (`lg`)
  - ícones Heart
  - texto do visitante
  - "Na coleção" rola até o CollectionPanel
- **21:** GalleryViewer com pinch, duplo toque e arrastar para fechar. (Os bugs de índice são fase 1.)
- **28:** rótulo da ordem atual; ícone `Check` no sheet.
- **33:** trocar o polling de 80 ms do Header por `useAnimatedReaction`.
- **34–46:** todo o POLIMENTO.
