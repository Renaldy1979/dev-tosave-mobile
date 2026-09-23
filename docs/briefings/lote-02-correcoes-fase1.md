# Lote 02 — Correções da revisão de design (fase 1)

Rodada de correções aplicada em cima do `revisao-design-lote-02.md`.
Escopo definido pelo Orquestrador em `docs/ESPECIFICACAO-MOBILE.md`
(Critério de pronto da fase 1): corrigir só os bloqueantes 1-6 e os
importantes 7, 8, 14-18, 20-27, 29-32. Tudo o que não está nessa
lista vai para `docs/briefings/fase-1.5-polimento.md` e fica para a
fase 1.5.

## Validação final

- `npx tsc --noEmit`: **zero erros**.
- Bundle Android (`/node_modules/expo-router/entry.bundle?platform=android`): **200**.
- Bundle iOS (`/node_modules/expo-router/entry.bundle?platform=ios`): **200**.
- `grep TODO|FIXME`: zero ocorrências.
- `grep "@/mocks"` em `app/` e `src/components/`: zero imports diretos.

## Bloqueantes (1-6)

1. **Header — `c("border")` dentro de worklet** —
   `src/components/ui/Header.tsx`: o `useAnimatedStyle` do
   `TransparentHeader` resolvia `c("border")` dentro do worklet, o
   que quebra no Reanimated 4. Resolvido fora (`const borderColor = c("border")`)
   e usado como string dentro do worklet.

2. **BottomSheet e Dialog com `ThemeScope` sempre em dark** —
   `BottomSheet.tsx` e `Dialog.tsx`: o `<ThemeScope scheme={scheme}>`
   agora segue o tema atual. Sobre ink continua dark porque o
   `GalleryViewer` usa `ThemeScope` próprio.

3. **BottomSheet — `dynamic` + `flex:1` quebrava altura** —
   `BottomSheet.tsx`: em modo `isDynamic` o conteúdo usa
   `BottomSheetView` sem `flex:1` e sem `BottomSheetScrollView`. O
   `enableDynamicSizing` do `@gorhom` calcula a altura sozinho.

4. **QuantityStepper — ícones invisíveis em glass** —
   `QuantityStepper.tsx`: na variante `glass` os ícones eram
   `c("primary-fg")` (#0B0B0D) sobre `bg-black/60`, preto sobre preto.
   Agora `#FFFFFF`.

5. **Coleção — busca some enquanto digita** —
   `colecao.tsx`: separado `searching` (estado local rápido) do
   `loadState` (carga inicial). Controles (SearchBar/SegmentedControl)
   agora ficam visíveis sempre que há itens na coleção, inclusive
   durante o typing. Empty state usa o texto oficial da spec
   ("Tente outro termo ou limpe os filtros.").

6. **Busca — "Todas as miniaturas" não faz nada** —
   `busca.tsx`: adicionado estado `showAll`; o botão do estado
   inicial agora liga `setShowAll(true)` e dispara `loadResults(1, true)`.

## Importantes (7, 8, 14-18, 20-27, 29-32)

7. **Busca — `FlashList` dentro de `Animated.ScrollView`** —
   `busca.tsx`: a virtualização só funciona fora de ScrollView.
   Refeito: uma única `FlashList` com `ListHeaderComponent` (header,
   chips, contagem, código exato) e `ListFooterComponent` (estados
   loading/error/empty/loadingMore).

8. **Busca — contagem ao vivo corrompia a tela** —
   `FilterSheet.tsx`: a contagem virou assíncrona com estado
   próprio do sheet e debounce de 200 ms. A prop `liveCount`
   agora é `(next, onResult) => void`. Em erro, o botão vira
   "Ver resultados" sem número. `busca.tsx`: `handleLiveCount`
   atualizado.

14. **Detalhe — galeria não rolava** —
   `[id].tsx`: a galeria foi movida para dentro do
   `Animated.ScrollView`, com `Header variant="transparent"`
   flutuando sobre ela. O `Header` foi ajustado para permitir
   uso fora de wrapper absoluto.

15. **Detalhe — campos vazios na ficha** —
   `[id].tsx`: cada `InfoRow` agora é condicional (`detail.toy ? …
   : null`); campos sem valor não geram linha. Cor usa `Palette`.

16. **Detalhe — copiar nunca funciona** —
   `InfoRow.tsx`: `tappable = Boolean(onPress) || copyable`; linhas
   `copyable` viram Pressable e disparam o `Clipboard.setStringAsync`
   no toque.

17. **Detalhe — sequência de headers e `errorMsg` cru** —
   `[id].tsx`: removido o `errorMsg ?? undefined` do `ErrorState` —
   agora usa o texto oficial "Não foi possível carregar." /
   "Verifique sua conexão e tente novamente.". As 3 trocas de header
   continuam (skeleton/empty/error/loading), mas sem `errorMsg` cru.

18. **Detalhe — ActionBar (inset duplo, sombra fixa)** —
   `[id].tsx`: `ScreenContainer edges=["bottom"]` já aplica o
   inset; removido `paddingBottom: Math.max(insets.bottom, 12)`
   para não duplicar. Removida também a `shadowOpacity` /
   `shadowRadius` fixas no dark (sem sombra por convenção do DS).

20. **ShareWhatsAppButton — cancelar vira erro** —
   `ShareWhatsAppButton.tsx`: `result.action !== Share.dismissedAction`
   trocado por `result.action === Share.sharedAction`. Cancelar
   deixa de contar como erro.

21. **Galeria — bugs de índice (sem pinch)** —
   `GalleryViewer.tsx`: `useEffect` reseta o índice quando o modal
   abre (`open` muda). `CarGallery.tsx`: ao fechar o visualizador,
   `listRef.current?.scrollToIndex({ index: last })` rola o pager
   para o último índice visto.

22. **Detalhe — toque < 44 pt** —
   `[id].tsx`: Badge da série, badge de atributo e botões
   "Ler mais/Ler menos" agora têm `hitSlop={10-12}` e
   `minHeight: 44`. Garantia de alvo ≥ 44 pt.

23. **Detalhe — pull-to-refresh removido** —
   `[id].tsx`: o `<RefreshControl>` foi removido da `Animated.ScrollView`
   (não estava na spec; pisca para skeleton ao puxar).

24. **Coleção — menu de long-press inacessível** —
   `CarCard.tsx`: adicionado `onLongPress?: () => void` na prop
   list. `colecao.tsx`: passa `onLongPress` no card e adiciona
   "Ver detalhes" no menu do sheet. O "Compartilhar no WhatsApp"
   agora chama `shareCar()` (helper exportado do
   `ShareWhatsAppButton`) em vez de só mostrar um Toast.

25. **Coleção — resumo sempre aparecia com coleção vazia** —
   `colecao.tsx`: o resumo agora é escondido também durante
   `showSkeleton` e `loadState === "error"`. Mantém o comportamento
   de sumir quando a coleção está vazia (`!collectionIsEmpty`).

26. **Textos** —
   `colecao.tsx`: "Sua coleção" → "Minha coleção"; "Repetid." →
   "Repetidos". `CarCard.tsx`: badge "Repetido ×N" agora é
   `<Badge variant="flame" size="sm">` em vez de caption solto.

27. **SegmentedControl — altura dos itens + a11y** —
   `SegmentedControl.tsx`: container agora é `h-12` (era `h-11`,
   dava 36 pt nos itens). `min-h-12` nos items. Acessibilidade
   agora inclui "${idx + 1} de ${options.length}" e
   ", selecionado" quando ativo.

29. **Perfil — teclado cobre o Editar perfil** —
   `Input.tsx`: nova prop `as?: "default" | "sheet"`. Quando
   `"sheet"`, o `TextInput` interno vira `BottomSheetTextInput`
   do `@gorhom/bottom-sheet`. `perfil.tsx`: passa `as="sheet"`
   nos dois inputs do BottomSheet "Editar perfil".

30. **Rota "/" ambígua** —
   `perfil.tsx`: `router.replace("/")` → `router.replace("/(tabs)")`
   (Sair). `[id].tsx`: idem em "Voltar ao início".

31. **Perfil — "Explorar miniaturas" < 44 pt** —
   `perfil.tsx`: `hitSlop={12}` e `minHeight: 44`.

32. **Toast — `show()` durante `hide()` apaga o Toast novo** —
   `Toast.tsx`: `currentId.current` rastreia o id do Toast atual;
   o `setTimeout` final de `hide()` só limpa `current` se o id
   ainda for o mesmo. Toast novo sobrevive.

## Arquivos alterados (principais)

- `app/car/[id].tsx` — galeria dentro do scroll, ficha com linhas
  condicionais, ActionBar sem inset duplo, "Voltar ao início" → "/(tabs)",
  remoção do RefreshControl, hitSlop ≥ 44 pt.
- `app/(tabs)/busca.tsx` — `showAll`, FlashList única, `handleLiveCount`
  assíncrono.
- `app/(tabs)/colecao.tsx` — `searching` separado de `loadState`,
  "Minha coleção", "Repetidos", long-press no card, "Ver detalhes"
  no menu, `shareCar()` real.
- `app/(tabs)/perfil.tsx` — `router.replace("/(tabs)")`, `as="sheet"`
  no Editar, "Explorar miniaturas" 44 pt.
- `src/components/ui/Header.tsx` — `c("border")` fora do worklet.
- `src/components/ui/BottomSheet.tsx` — `ThemeScope scheme={scheme}`,
  dynamic sem `flex:1`/`BottomSheetScrollView`.
- `src/components/ui/Dialog.tsx` — `ThemeScope scheme={scheme}`.
- `src/components/ui/QuantityStepper.tsx` — ícones brancos em glass.
- `src/components/ui/FilterSheet.tsx` — `liveCount` assíncrono com
  debounce, "Ver resultados" enquanto carrega.
- `src/components/ui/InfoRow.tsx` — `tappable` inclui `copyable`.
- `src/components/ui/SegmentedControl.tsx` — `h-12`, a11y completa.
- `src/components/ui/Input.tsx` — prop `as="sheet"` com
  `BottomSheetTextInput`.
- `src/components/ui/Toast.tsx` — `currentId` para evitar race
  entre `hide()` e novo `show()`.
- `src/components/ui/ShareWhatsAppButton.tsx` — `shareCar()`
  exportado, cancelar não é erro.
- `src/components/car/CarCard.tsx` — `onLongPress`, badge flame em
  vez de caption.
- `src/components/car/CarGallery.tsx` — `scrollToIndex` ao fechar.
- `src/components/car/GalleryViewer.tsx` — `useEffect` reseta índice.
