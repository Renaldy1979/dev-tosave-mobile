# Fase 1.5 — Polimento (backlog)

Itens das specs de tela e das revisões de design que **não bloqueiam** a fase 1. O critério está em `docs/ESPECIFICACAO-MOBILE.md`, em "Critério de pronto da fase 1". Nada aqui entra antes da fase 1 estar entregue.

## Do teste do usuário na fase 2 (23/09/2026)

- **Controle de quantidade (− / +):** sai dos cards da Coleção e fica só no Detalhe do carro, quando o carro já está na coleção do usuário.
- **Imagens do app antigo para reaproveitar** (repositório `Renaldy1979/TOSAVE-MOBILE`, clonado para consulta em `C:/Dev/referencia/TOSAVE-MOBILE/src/assets/images/`):
  - `avatar.png`: imagem padrão do usuário sem foto (Perfil / avatar).
  - `thunt.png` e `sthunt.png`: logos dos atributos **Treasure Hunt** e **Super Treasure Hunt**, para usar nos badges de atributo.
  - Ícone do **WhatsApp** para o botão Compartilhar: o usuário diz que está lá, mas a pasta só tem `avatar`, `logo`, `sthunt` e `thunt`. Confirmar com ele onde está.
- **Navegação lenta entre telas** (Android e iOS, no Expo Go), relatado pelo usuário em 24/09/2026. Investigar sem otimizar agora: medir num build de desenvolvimento ou de produção antes de mexer.
- **Desempenho no iOS:** a navegação pareceu lenta no Expo Go. Avaliar num build de desenvolvimento ou de produção (o Expo Go roda em modo dev, sem otimizações) antes de otimizar.

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

## Correções anotadas em 25/09/2026 (fase 1: fazer antes do próximo lote)

- **Perfil → Sair:** o diálogo com Sair e Cancelar aparece no topo da página. Ele tem de ficar centralizado e por cima da tela toda, com fundo escurecido. O ícone de sair que aparece junto não faz sentido do jeito que está: tirar ou rever com a Aquarela. Em 23/09 isso tinha sido validado; conferir se a v2 ou o build de desenvolvimento trouxeram a regressão.
