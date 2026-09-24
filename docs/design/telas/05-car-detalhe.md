# 05 — Detalhe do carro

| | |
|---|---|
| Rota | `app/car/[id].tsx` → `/car/{id}` (Stack sobre as tabs, **sem TabBar**) |
| Acesso | **público** (visitante ou logado); adicionar à coleção pede login se não houver sessão |
| Tema | segue o tema; galeria no topo e visualizador sempre sobre palco escuro/preto |
| Dados | `cars.get(id)` (car + brand + serie + attributes + images), `cars.listBySerie(serieId, { excludeId: id, limit: 10 })`, `collection` store |

Tela premium: a miniatura em primeiro plano, informação organizada como ficha técnica, ações ao alcance do polegar.

## 1. Layout

```
┌───────────────────────────────┐
│ (‹)                           │  Header transparent: só voltar (glass); as ações ficam na ActionBar
│                               │
│       [ GALERIA 4:3 ]         │  CarGallery largura total, palco escuro
│                               │  swipe entre fotos; toque abre o GalleryViewer
│  #001               ● ○ ○ ○   │  Badge accent #collector (esq.) · dots (dir.)
├───────────────────────────────┤  folha surface sobe 16 pt sobre a galeria (rounded-t-xl)
│ MATTEL · 2024 · 1/64          │  eyebrow fg-subtle
│ '71 Datsun 510                │  display-md font-display-black fg (até 3 linhas)
│ Wagon                         │
│ [HW J-Imports] [8/10] [Em destaque]│ Badges: primary (série, tocável), glass→neutral mono, flame
│                               │
│ ┌───────────────────────────┐ │
│ │ ♥ Na sua coleção      × 2 │ │  CollectionPanel (só se na coleção): surface-2 rounded-lg
│ │   [ −   2   + ]           │ │  QuantityStepper secondary
│ └───────────────────────────┘ │
│                               │
│ Sobre                         │  h2
│ Lançado na linha J-Imports…   │  body-lg fg-muted, 5 linhas + "Ler mais"
│                               │
│ Ficha                         │  h2
│ 🏷 Marca          Mattel    › │  InfoRow (marca tocável → Busca por marca)
│ #  Número         #001    ⧉   │  mono, copiável
│ ⌗  Código (toy)   HKJ42   ⧉   │  mono, copiável
│ 📅 Ano            2024      › │  tocável → Busca por ano
│ ▦  Série          J-Imports › │  tocável → Busca por série
│ ≡  Posição        8/10        │  mono
│ 📏 Escala         1/64        │  mono
│ 🎨 Cor            ● Azul      │  ColorBadge
│                               │
│ Atributos                     │  h2
│ [✦ Real Riders] [(TH) Treasure Hunt] │ Badges neutral com Sparkles (tocáveis → Busca por atributo); T-Hunt e Super T-Hunt com ícone próprio (componentes §5.1)
│                               │
│ Mais da série        Ver tudo │  SectionHeader
│ [card][card][card]→           │  faixa horizontal de CarCard grid (largura 150)
│                               │
├───────────────────────────────┤
│ [ WhatsApp Compartilhar ] [ ♥ Adicionar à coleção ] │ ActionBar fixa (e2), + insets.bottom
└───────────────────────────────┘
```

### 1.1 Galeria e header
- `CarGallery` (componentes §15.1) ocupa a largura total e vai até o topo da tela (por baixo da status bar). Status bar `light` enquanto o header está transparente.
- O conteúdo começa numa "folha" `bg-bg rounded-t-xl` que sobrepõe 16 pt a base da galeria (sensação de cartão premium).
- Parallax: ao puxar para baixo (overscroll), a galeria amplia (escala até 1.15) em vez de mostrar espaço vazio; ao rolar para cima, a galeria sobe a 0,5× da velocidade. Desligado com movimento reduzido.
- Header `transparent` (componentes §7): só o voltar em glass (coração e compartilhar ficam na ActionBar, ao alcance do polegar, sem duplicar). Depois de rolar a galeria, o header ganha fundo `surface` com blur, os ícones viram `ghost` e aparece o título em `h3` (1 linha, truncado). Status bar passa a seguir o tema.

### 1.2 ActionBar fixa (base)
- `bg-surface border-t border-border` + `elevation("e2")`, `px-4 pt-3`, `paddingBottom: max(insets.bottom, 12)`.
- Fora da coleção (ou visitante): `ShareWhatsAppButton button` (1/3) + `Button primary lg` "Adicionar à coleção" com `Heart` (2/3). Visitante: o toque abre o login em modal (`intent=add&carId`); ao entrar, o carro é adicionado, o CollectionPanel aparece e a barra passa ao estado "Na coleção". Compartilhar funciona sem login.
- Na coleção: `ShareWhatsAppButton` (1/3) + `Button outline lg` "Na coleção · 2" com `Heart` preenchido flame (2/3). Tocar rola até o CollectionPanel e dá foco ao stepper (a remoção fica no painel, com confirmação).
- A barra nunca some com a rolagem.

### 1.3 CollectionPanel
- Só existe com sessão e carro na coleção. Aparece com fade + altura animada (320 ms) ao adicionar.
- Linha 1: `Heart` flame + "Na sua coleção" `body font-sans-medium` + quantidade em `font-display-black text-accent` ("×2") à direita.
- Linha 2: `QuantityStepper secondary` + link `ghost sm` "Remover da coleção" (abre ConfirmDialog).
- Stepper de 1 → "−" chama o ConfirmDialog "Remover da coleção?" (componentes §9.2).
- Com `quantity > 1`, mostra Badge flame "Repetido" ao lado do título do painel.

## 2. Hierarquia
1. Imagem (galeria)
2. Identidade: marca · ano · escala → título → série e posição
3. Estado na coleção (quantidade)
4. Ação principal: adicionar à coleção / compartilhar
5. Descrição
6. Ficha técnica (marca, código toy, collector, ano, série, posição, escala, cor)
7. Atributos
8. Mais da série

## 3. Regras de conteúdo
- Campo vazio: a linha da ficha **não aparece** (não mostrar "—"). Sem descrição: a seção "Sobre" some. Sem atributos: a seção "Atributos" some. Sem outros carros na série: "Mais da série" some.
- `collector` sempre `#` + valor original (zeros preservados). `toy`, `seriePosition`, `scale` em `font-mono`.
- Descrição: `numberOfLines={5}` + "Ler mais" (`primary-text`) que expande inline (animação de altura 200 ms); "Ler menos" recolhe.
- Estado da marca (`brand.state`): se "descontinuada", Badge neutral com `Archive` "Descontinuada" ao lado da marca na ficha; "em análise" não é exibido ao colecionador.

## 4. Navegação

| Ação | Destino |
|---|---|
| Voltar (header, gesto, back do Android) | `router.back()`; sem histórico (deep link) → `router.replace("/")` |
| Tocar na galeria | abre `GalleryViewer` no índice atual |
| Badge da série / linha Série | `router.push("/busca?serie={serieId}")` |
| Linha Marca | `router.push("/busca?brand={brandId}")` |
| Linha Ano | `router.push("/busca?year={year}")` |
| Badge de atributo | `router.push("/busca?attr={attributeId}")` |
| Card em "Mais da série" | `router.push("/car/{id}")` (empilha; voltar retorna ao carro anterior) |
| "Ver tudo" (Mais da série) | `router.push("/busca?serie={serieId}")` |
| Toast "Ver" após adicionar | `router.push("/colecao")` |

## 5. Estados

| Estado | Visual |
|---|---|
| **Carregando** (> 150 ms) | `CarDetailSkeleton`; header já mostra voltar (glass sobre palco skeleton). ActionBar com botões em skeleton. Se a tela veio de um card, usar os dados do card (título, thumb, marca, ano, collector) como **prévia imediata** e completar quando `cars.get` chegar: a skeleton só cobre descrição, ficha e atributos. |
| **Conteúdo** | Como o layout. |
| **Sem imagens** | Galeria vira palco com `Car` 56 pt `fg-subtle/40`, sem dots; toque não abre o visualizador. |
| **Imagem falhou** | Placeholder no slide; o visualizador pula slides com erro. |
| **Carro não encontrado** (id inválido, removido) | Tela com Header `stack` e `EmptyState kind="no-cars" size="lg"` → **"Nenhuma miniatura disponível no momento."** + ação "Voltar ao início" (`router.replace("/")`). |
| **Erro ao carregar** | Header `stack` + `ErrorState lg` com "Tentar novamente". Se havia prévia do card, mantém a prévia e mostra `ErrorState sm` no lugar da ficha. |
| **"Mais da série" carregando** | faixa com 3 `CarCardSkeleton`. Erro: a seção some (não é essencial). |
| **Adicionar/alterar/remover falhou** | Reverte o estado otimista + Toast danger "Não foi possível atualizar sua coleção." |
| **Compartilhar falhou** | Toast "Não foi possível compartilhar agora." |

## 6. Acessibilidade
- Galeria: "Foto 1 de 4 de '71 Datsun 510 Wagon. Toque duas vezes para ampliar."
- Título com `accessibilityRole="header"`.
- InfoRow lê "Código toy, HKJ42. Toque duas vezes para copiar."
- ActionBar entra na ordem de leitura por último (depois do conteúdo), mas é alcançável pelo rotor de "botões".

## 7. Critérios de aceite
- [ ] Galeria com swipe, dots, e visualizador com pinch, duplo toque e arrastar para fechar.
- [ ] Mostra descrição, marca, código toy, collector `#001`, ano, série, posição, escala, cor e atributos quando existirem.
- [ ] Detalhe completo acessível sem login; "Adicionar à coleção" pede login ao visitante e conclui a ação depois.
- [ ] Quantidade na coleção visível e ajustável; remover pede confirmação.
- [ ] Compartilhar abre o WhatsApp com a mensagem formatada; sem WhatsApp, share sheet nativo.
- [ ] Nenhum campo vazio aparece como "—".
- [ ] Voltar preserva o estado da lista de origem.
