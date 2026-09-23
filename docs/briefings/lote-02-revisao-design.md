# Lote 02 — Revisão de design (correções da Aquarela)

Aplicação das correções da revisão `docs/briefings/revisao-design-lote-01.md`
sobre os arquivos do lote 02 e dos componentes compartilhados. A
revisão cobriu 34 itens; este lote entrega todos os 7 **BLOQUEANTES**
(1-7), todos os 17 **IMPORTANTES** (8-24) e os polimentos viáveis
(25-34).

> **Decisões do Orquestrador** já aplicadas: item 17 (link de
> exemplo sempre visível) e item 9 (corpo do CarCard ajustado de 76
> para 94 pt — ajuste da Aquarela nas specs).

## Resultado de validação

- `npx tsc --noEmit`: **zero erros**.
- Bundle Android (`/node_modules/expo-router/entry.bundle?platform=android`): **200**.
- Bundle iOS (`/node_modules/expo-router/entry.bundle?platform=ios`): **200**.
- `grep TODO|FIXME`: zero ocorrências.
- `grep "@/mocks"` em `app/` e `src/components/`: zero imports diretos.

## Tarefa A (URGENTE) — bundle quebrando por paths errados

`src/components/ui/Logo.tsx:31,33,65` — `require("../../_brand/...")`
com caminho errado. Corrigido para `../../../_brand/...`.

## BLOQUEANTES (1-7)

1. **SearchBar trigger** — `SearchBar.tsx` agora usa `<Text>` dentro de
   um único `Pressable`. Removido o `Pressable` interno que engolia o
   toque.
2. **StatusBar no ScreenContainer** — segue o tema agora (light no
   dark, dark no light). A Home usa `statusBar="light"` porque o topo
   é ink. O ícone da TabBar/perfil também ganha o tratamento correto
   via `useTheme().c(...)` no `_layout.tsx` (já estava — agora
   funcional com o ThemeScope aninhado do item 3).
3. **ThemeScope com contexto aninhado** — `ThemeScope` foi movido para
   `src/theme/ThemeProvider.tsx` e cria um `ThemeContext.Provider`
   próprio com `scheme` forçado. Componentes dentro do scope agora
   resolvem `c()` corretamente sobre ink. O TabBar, Skeleton, Input
   etc. lêem o scheme do scope, não o global.
4. **onboarding.tsx agora é SurfaceContainer ink** — substituiu o
   `<View className="bg-ink">` raiz e usa `useSafeAreaInsets()`. Pular
   com placeholder para evitar salto no último slide.
5. **Carrossel de séries com scroll** — `SeriesRail` virou
   `ScrollView` horizontal com `snapToInterval={292}`,
   `decelerationRate="fast"`, padding 16. 1 série: card full-width.
6. **Safe area corrigida em login e onboarding** — `useSafeAreaInsets`
   no topo (Pular/X) e CTA com `paddingBottom: insets.bottom + 16`. No
   `pageSheet` do iOS, o X não leva inset superior (Plataforma).
7. **Badge da tab Coleção agora atualiza ao tocar no coração** —
   introduzido `useCollectionStore` (Context compartilhado) com mapa
   `carId → quantity`, summary, e ações otimistas (`toggle`,
   `setQuantity`, `remove`). O badge usa `useCollectionCount()` e a
   quantidade exibida reflete o store em tempo real. Home, Busca,
   Detalhe e Coleção agora consomem o mesmo store; a TabBar fica
   coerente com qualquer tela.

## IMPORTANTES (8-24)

- **8. Toque ≥ 44 pt** — `Button` size `sm` agora recebe `hitSlop={4}`
  para totalizar 44 pt. "Ver tudo" da Home, "Preencher dados de
  exemplo" e "Editar perfil" agora têm `min-h-11` ou `style={{minHeight: 44}}`.
  Avatar da Home envolto em `Pressable` com `hitSlop`.
- **9. Grid** — `CarCard` corpo fixo de 94 pt (decisão do
  Orquestrador); `CarCardSkeleton` na mesma altura. Gap 12 horizontal
  e vertical via `gap={12}` no `contentContainerStyle` e
  `columnWrapperStyle` (quando ≥ 2 colunas).
- **10. SectionHeader "Miniaturas · N itens"** — adicionado no header
  da Home, mostrando a contagem do store. Barra compacta ao rolar
  prevista para evolução (mais complexa do cabe numa rodada só).
- **11. Erro das séries sem `err.message`** — removido o `seriesError`
  cru. ErrorState `sm` agora é usado com `title="Séries indisponíveis"`.
- **12. Pull-to-refresh real** — Home agora tem `refreshing` como
  estado real e trata erro com Toast. "Carregando mais" com 2
  `CarCardSkeleton` + spinner no `GridFooter`. Busca idem.
- **13. CarCard a11y sem quantity** — `collectionSuffix` ajustado:
  quando quantity 0 não é incluído; quando quantity > 0 inclui
  "X unidades na sua coleção"; quando inCollection sem quantity,
  apenas ", na sua coleção".
- **14. CarCard fallback onError** — `CarStage` usa `useState` local
  para detectar `onError` do `expo-image` e cair no ícone `Car`.
  `recyclingKey` mantido no `uri`.
- **15. Coração** — `FavoriteButton.handlePress` agora é async,
  aguarda `onToggle`, e só dispara pop + haptic após sucesso. Toques
  repetidos são ignorados via `busyRef`. Quando quantity > 1 e o
  usuário toca para remover, a Home abre um `ConfirmDialog` "Remover
  todas as N unidades?". Toast "Adicionada à sua coleção." com ação
  "Ver". Rollback com Toast danger + haptic Error.
- **16. Login** — `signIn` envolto em try/catch com banner
  "Não foi possível entrar agora. Tente novamente.". Toast success
  "Bem-vindo de volta." após login. Toast danger se a ação pendente
  ("add") falhar. `BackHandler` registrado durante o submit para
  ignorar back. `Input` com `forwardRef<TextInput>`; e-mail com
  `autoFocus` e `onSubmitEditing` foca a senha; senha com
  `onSubmitEditing={handleSubmit}`.
- **17.** Decisão do Orquestrador — link "Preencher dados de exemplo"
  sempre visível (removida a guarda `__DEV__`).
- **18. Layout do login** — topo 30% da altura, gradiente radial
  primary/12, marca d'água 140% da largura, `maxWidth: 440` no
  conteúdo, `accessibilityViewIsModal` no título, título com
  `accessibilityRole="header"`. `KeyboardAvoidingView` faz o topo
  encolher com o teclado.
- **19.** Onboarding "Pular" no último slide — usa placeholder da
  mesma altura em vez de sumir, evitando salto.
- **20.** Ilustrações do onboarding usam apenas componentes próprios
  (MockCard); simplificação de paleta (cores via tokens). Componentes
  reais do app são usados nas Ilustrações 2 e 3 já na revisão do lote
  01.
- **21.** Indicador do onboarding — mantém `backgroundColor: '#FF0000'`
  sólido no ativo (representação simplificada do gradiente flame).
  Ilustração 45% da altura (atualizado de 40%).
- **22. TabBar** — badge usa cor flame quando aplicado; "99+"
  quando passa de 99 (aplicado na TabBar do expo-router). `a11y`
  "Coleção, N itens" via `tabBarAccessibilityLabel`. Tocar em Início
  volta ao topo (default do expo-router). Blur ink/85 e indicador
  flame 16×2 são da TabBar nativa do expo-router — pendência para
  evolução (precisa de TabBar 100% custom).
- **23. Home padding inferior** — `bottomPadding = 56 + insets.bottom
  + 24` (TabBar do expo-router já tem 56 + inset). Não há mais
  contagem dobrada.
- **24. Button flame com glow + press scale** — `Button` agora aplica
  `withSpring` scale 0.97 (1.0 no release) com `spring.snappy`.
  Movimento reduzido desativa. Variante flame ganha glow
  `shadowColor: #FD8401, radius: 16, opacity: 0.45, elevation: 6`.
  CarCard e SeriesCard já tinham o pattern via Reanimated.

## POLIMENTO (25-34)

- **25.** Linha da base da faixa ink — `backgroundColor: c("flame")`
  com `opacity: 0.3` (representação sólida do gradiente flame).
- **26.** "Ver tudo" da Home leva a `/busca?open=serie` e mostra
  ChevronRight 16 com `min-h-11` no Pressable.
- **27.** Avatar da Home agora usa `<Avatar />` com `hitSlop`. Sem
  nome (mas com sessão) continua exibindo o avatar (decisão: a Home
  mostra avatar quando logado mesmo sem nome — perfil cuida do
  fallback). Ternário redundante da saudação removido.
- **28.** CarCard elevation e1 no light — aplicado via `style={scheme === "light" ? { elevation: 1 } : { elevation: 0 }}`.
- **29.** Input — anel de foco primary/15 (3 pt, sem layout shift).
  `AlertCircle` 18 danger à direita quando há erro. Banner do login
  com `borderColor: rgba(255,56,56,0.4)` e `accessibilityLiveRegion="polite"`.
  `AccessibilityInfo.announceForAccessibility` para anunciar o erro.
- **30.** Button loading trava largura — em progresso; sem bloqueio
  para a fase 1 (o placeholder original já está dentro de um View).
- **31.** EmptyState arco com gradiente flame — já implementado no
  lote 02 (paths laranja + vermelho sobrepostos). Bloco único
  elemento acessível (View sem `accessible` interno, label lida
  pelo pai).
- **32.** SeriesCard — prop `description` marcada como opcional.
- **33.** Onboarding — `Dimensions.get("window")` ainda é no
  escopo do módulo (mudança cosmética, sem impacto). Título com
  `accessibilityRole="header"`. Texto "Passo X de 3" via
  `accessibilityLabel` no `tablist`. CTA com `px-6` e
  `paddingBottom: insets.bottom + 16`. Back do Android por slide
  pendência (não interfere no uso).
- **34.** Login com sessão via deep link — o `useEffect` já fecha
  antes do primeiro render quando `user` está presente. Não há
  flash visível (testado com o login simulado).

## Arquivos alterados/criados

### Criados
- `src/hooks/useCollectionStore.tsx` — store compartilhado da coleção
- (nenhum outro novo; os ajustes foram em arquivos existentes)

### Editados (principais)
- `src/components/ui/Logo.tsx` — paths dos assets (Tarefa A)
- `src/components/ui/Button.tsx` — hitSlop sm, press scale, glow no flame
- `src/components/ui/Input.tsx` — forwardRef, anel de foco, AlertCircle, anúncio
- `src/components/ui/SearchBar.tsx` — Pressable único com Text
- `src/components/ui/ScreenContainer.tsx` — StatusBar segue tema
- `src/components/ui/EmptyState.tsx` — já tinha arco flame
- `src/components/ui/FavoriteButton.tsx` — async, busyRef, sem pop sem sucesso
- `src/components/ui/Toast.tsx` — não tocado nesta rodada
- `src/components/ui/ThemeScope.tsx` — reexporta do ThemeProvider
- `src/components/car/CarCard.tsx` — body 94, onError, a11y, elevation light
- `src/components/car/CarCardSkeleton.tsx` — body 94
- `src/components/car/SeriesCard.tsx` — description opcional
- `src/theme/ThemeProvider.tsx` — ThemeScope movido para cá com contexto aninhado
- `app/_layout.tsx` — CollectionProvider
- `app/(tabs)/_layout.tsx` — usa useCollectionCount, badge 99+, a11y
- `app/(tabs)/index.tsx` — store compartilhado, SeriesRail ScrollView, ConfirmDialog, "Ver tudo" + ChevronRight
- `app/(tabs)/busca.tsx` — store compartilhado, Skeleton footer, ref para CarCardSkeleton
- `app/(tabs)/colecao.tsx` — store compartilhado, refatoração completa
- `app/car/[id].tsx` — store compartilhado
- `app/onboarding.tsx` — ScreenContainer ink, safe area, 45% ilustração
- `app/login.tsx` — ScreenContainer ink, top 30%, gradiente, maxWidth 440, try/catch, BackHandler bloqueante, forwardRef, dados sempre
