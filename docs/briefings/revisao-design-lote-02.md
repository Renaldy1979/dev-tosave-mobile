# Revisão de design — Lote 02 (Aquarela)

## Decisões do Orquestrador

- **Itens 11 (FilterSheet com os 8 primeiros e "Ver todos") e 21 (GalleryViewer com pinch, duplo toque e arrastar para fechar):** entram **nesta fase**. São critérios de aceite das specs, e as specs são a fonte da verdade.
- **Sair e "Voltar ao início":** navegar direto para a rota das tabs (`/(tabs)`), não para `/`.

Escopo: Busca (`app/(tabs)/busca.tsx`), Detalhe (`app/car/[id].tsx`), Coleção (`app/(tabs)/colecao.tsx`), Perfil (`app/(tabs)/perfil.tsx`) e os componentes novos listados em `lote-02-busca-detalhe-colecao-perfil.md`. Referências: specs `telas/04..07`, `design-system-mobile.md` e `componentes.md`.

Revisão só de leitura, feita no código, sem rodar o app em aparelho. Os itens marcados **(verificar no aparelho)** dependem de comportamento em runtime.

O que já está em `revisao-design-lote-01.md` não se repete aqui. Isso vale sobretudo para:
- `c()` ignorando o `ThemeScope` (item 3)
- StatusBar fixa (item 2)
- Button sm sem hitSlop (item 8)
- geometria do grid (item 9)
- pull-to-refresh com `refreshing={false}` (item 12)
- store de coleção compartilhado (item 7)
- padding inferior dobrado (item 23)

Essas correções valem também para as telas do lote 02.

## Resumo

| Prioridade | Itens |
|---|---|
| Bloqueante | 6 |
| Importante | 27 |
| Polimento | 13 |

## BLOQUEANTE

1. **`src/components/ui/Header.tsx:270-273`: crash provável ao rolar o Detalhe (verificar no aparelho).**
   - O `useAnimatedStyle` do `TransparentHeader` chama `c("border")`, uma função JS comum, dentro do worklet. Na UI thread o Reanimated 4 lança erro ao chamar função que não é worklet, e a primeira rolagem do detalhe derruba o app.
   - Corrigir: resolver a cor fora do worklet (`const borderColor = c("border")`) e usar só a string dentro dele, como já é feito com `surfaceBg`.

2. **`src/components/ui/BottomSheet.tsx:129` e `src/components/ui/Dialog.tsx:100`: portais sempre em dark.**
   - `<ThemeScope>` sem `scheme` aplica sempre o tema dark. No tema light:
     - o painel do sheet é branco (`backgroundStyle` = `c("surface")` do tema light), mas o texto herda o `fg` do dark (#F6F6F8). Resultado: texto branco sobre branco em Filtros, Ordenar, Editar perfil e no menu da Coleção.
     - os Dialogs (Sair, Remover) saem escuros no tema claro.
   - O DS §4.3 manda o `ThemeScope` usar o esquema **atual** nos portais.
   - Corrigir: `<ThemeScope scheme={scheme}>` (via `useTheme().scheme`). O `GalleryViewer` continua dark, que está certo.

3. **`src/components/ui/BottomSheet.tsx:113-114, 130-139`: sheets `dynamic` com altura quebrada (verificar no aparelho).**
   - Com `enableDynamicSizing`, o conteúdo não pode ter `flex: 1`, mas o `BottomSheetView` tem `style={{ flex: 1 }}`. Além disso, todo sheet embrulha o conteúdo num `BottomSheetScrollView` (padrão `scrollable = true`) dentro de um `BottomSheetView`, combinação que o @gorhom não suporta.
   - Risco: Ordenar, Editar perfil e o menu da Coleção abrem com altura 0 ou cortados.
   - Corrigir:
     - no modo `dynamic`, usar `BottomSheetView` sem `flex` e sem scroll interno;
     - com snapPoints fixos, usar `BottomSheetScrollView` como filho direto;
     - passar o footer via `footerComponent` (`BottomSheetFooter`).

4. **`src/components/ui/QuantityStepper.tsx:118, 144`: botões − e + invisíveis nos cards da Coleção.**
   - Na variante `glass`, os ícones usam `c("primary-fg")` (#0B0B0D) sobre `bg-black/60`, preto sobre preto. O número aparece, mas os botões não.
   - Corrigir: ícones brancos (`#FFFFFF`) no `glass`.

5. **`app/(tabs)/colecao.tsx:120, 372, 411-437`: a busca da Coleção some enquanto o usuário digita.**
   - Cada termo com debounce chama `load()`, que põe `loadState = "loading"`. A linha 372 esconde os controles (SearchBar, Todos/Repetidos, ordenação) em `loading` e em `empty`. O SearchBar desmonta a cada busca e o teclado fecha.
   - Quando a busca não acha nada, `loadState = "empty"`: aparece o empty state de "repetidos" (ação "Ver todos") e o SearchBar não volta mais, então não dá para limpar o termo. O ramo da linha 444 ("Limpar busca") nunca é alcançado.
   - Corrigir:
     - separar o estado da lista do estado dos controles;
     - controles visíveis sempre que `summary.totalItems > 0`;
     - carregamento da busca afeta só o grid;
     - busca sem resultado usa o empty state com "Limpar busca".

6. **`app/(tabs)/busca.tsx:496-499`: "Todas as miniaturas" não faz nada.**
   - O botão só chama `loadResults(1, true)`, mas `showResults` continua `false` (sem termo e sem filtro), então a tela segue no estado inicial.
   - Corrigir: estado `showAll` (ou param `all=1`) que liga o grid sem filtro.

## IMPORTANTE

### Busca

7. **`busca.tsx:561-582`: FlashList 2.0.2 dentro de `Animated.ScrollView`.**
   - A lista perde a virtualização, e o `onEndReached` é calculado sobre uma lista que não rola sozinha. A paginação provavelmente não passa da 1ª página (verificar no aparelho).
   - Erro na página 2 em diante troca o grid inteiro por `ErrorState` (175, 187), quando a spec pede o rodapé "Não foi possível carregar mais.".
   - Corrigir: uma única FlashList com `ListHeaderComponent` (busca, chips, contagem, código exato), como na Home.

8. **`busca.tsx:287-302` + `FilterSheet.tsx:92`: contagem ao vivo corrompe a tela.**
   - `liveCount` chama `setTotal` da própria tela, então "312 miniaturas" passa a mostrar a contagem do rascunho e fica errada se o sheet for fechado sem aplicar.
   - A função devolve o `total` anterior, então o botão mostra o número de um passo atrás e pode desabilitar indevidamente com "Nenhum resultado".
   - O `setState` roda dentro de `useMemo`, durante o render.
   - Corrigir: contagem assíncrona com estado próprio do sheet, debounce de 200 ms; em erro, o botão vira "Ver resultados" (spec 04 §6).

9. **Estado inicial incompleto (`busca.tsx:656-758`).**
   - Falta o bloco "Buscas recentes" (spec 04 §1.1), e o `onSubmit` não grava recentes.
   - Os títulos "EXPLORAR POR SÉRIE/MARCA" (677, 709) aparecem mesmo com o bloco vazio ou com erro; a spec diz que o bloco some.
   - Falta o "Ver todas" das séries.

10. **Chips e seções do FilterSheet.**
    - Os chips dropdown (366, 385, 404, 423) abrem o sheet sem indicar a seção.
    - `initialSection` só desenha um traço de 24×2 (`FilterSheet.tsx:340-342`) e não rola até a seção.
    - Spec §12.2: abrir já rolado para a seção tocada.

11. **`FilterSheet.tsx:171-266`: todas as opções aparecem de uma vez.**
    - Falta o "8 primeiros + Ver todos (N)", que é critério de aceite da spec 04 §8.
    - O briefing trata como evolução; peço decisão do Orquestrador.

12. **Params `focus` e `open`.**
    - `focus=1` só funciona no mount via `autoFocus` (468). Com a tab já montada, vir da Home não foca o campo. O param nunca é removido.
    - `open=` também nunca é limpo (257-261).
    - Falta o comportamento "2º toque na tab Buscar foca o campo".

13. **Header `large` não colapsa (`Header.tsx:219-234`).**
    - O título grande só faz fade e continua ocupando o espaço, deixando uma faixa vazia de ~100 pt no topo de Busca, Coleção e Perfil.
    - SearchBar e chips estão dentro do scroll (`busca.tsx:463-485`), não ficam sticky.
    - Spec §7 e 04 §1: o título colapsa em altura e a busca fica presa na barra.

### Detalhe

14. **`[id].tsx:261-286`: a galeria não rola.**
    - A galeria fica fixa fora do ScrollView e só a folha rola por baixo dela. Num celular de 390 pt a galeria ocupa ~290 pt, e a ficha fica com metade da tela.
    - Não há parallax. O header troca de transparente para `surface` enquanto a galeria continua visível.
    - Corrigir: galeria dentro do scroll (spec 05 §1.1).

15. **Campos vazios aparecem na ficha (`[id].tsx:405-431`).**
    - Número, Código, Escala e Cor são renderizados sempre, mesmo vazios.
    - Spec 05 §3 e critério de aceite: a linha não aparece.

16. **Copiar nunca funciona (`InfoRow.tsx:49, 69` + `[id].tsx:405-406`).**
    - O InfoRow só vira Pressable quando recebe `onPress`. As linhas `copyable` (Número e Código) não recebem, então tocar não copia.
    - Corrigir: `tappable = Boolean(onPress) || copyable`.

17. **Sequência de estados do detalhe.**
    - Nos primeiros 150 ms aparece o fallback com Header `stack` "Detalhe" (242-250). Depois vem a skeleton com Header `stack` "Carregando..." (236) e por fim o header transparente: três trocas de header.
    - Spec 05 §5: voltar em glass sobre o palco da skeleton, com prévia dos dados do card.
    - O erro mostra `errorMsg` cru (227); usar o texto oficial.

18. **ActionBar (`[id].tsx:500-513`).**
    - O `ScreenContainer edges=["bottom"]` já aplica o inset, e a barra soma `max(insets.bottom, 12)` de novo, então o inset entra duas vezes.
    - O wrapper externo não tem fundo: a faixa abaixo da barra fica transparente, com o conteúdo aparecendo atrás.
    - A sombra está fixa no código e aparece também no dark (DS §8: sem sombra no dark); usar `elevation("e2")`.

19. **Botões da ActionBar (`[id].tsx:514-548`).**
    - Compartilhar tem 44 pt (`ShareWhatsAppButton.tsx:117`) e o primary `lg` tem 52 pt: alturas desiguais. A origem é a spec (§14 pede `md`); vou alinhar a spec para `lg` na barra.
    - "Adicionar à coleção" sem o ícone `Heart`; "Na coleção · 2" sem o `Heart` preenchido flame.
    - O visitante vê "Entrar para adicionar" (542); a spec mantém "Adicionar à coleção".
    - "Na coleção" rola para y=0 em vez de ir até o CollectionPanel e focar o stepper.

20. **`ShareWhatsAppButton.tsx:71, 90`: cancelar vira erro.**
    - Fechar a share sheet sem compartilhar (`dismissedAction`) conta como falha e mostra o Toast danger "Não foi possível compartilhar agora.".
    - Cancelar não é erro.

21. **Galeria.**
    - Faltam pinch, duplo toque e arrastar para fechar, que são critério de aceite da spec 05 §7. O briefing trata como evolução; peço decisão do Orquestrador.
    - `GalleryViewer.tsx:45`: `useState(initialIndex)` só inicializa uma vez, então na 2ª abertura o contador mostra o índice antigo.
    - `CarGallery.tsx:99-101`: ao fechar, o índice é atualizado mas o pager não rola, e dots e foto ficam dessincronizados.

22. **Toque menor que 44 pt.**
    - Badge da série (308) e badges de atributo (448): badge de 24 pt + hitSlop 6 = 36 pt.
    - "Ler mais"/"Ler menos" (366, 379): 22 pt + hitSlop 8 = 38 pt.

23. **Pull-to-refresh no detalhe (`[id].tsx:278-284`).**
    - Não está na spec, e puxar recarrega a tela inteira, que pisca para skeleton.
    - Remover.

### Coleção

24. **Menu de pressão longa inacessível.**
    - `handleLongPress` (279) nunca é ligado ao card: o CarCard não tem `onLongPress`.
    - Falta "Ver detalhes" no menu.
    - "Compartilhar no WhatsApp" só mostra um Toast mandando ir à tela do carro (527); deveria compartilhar.

25. **Resumo e erro.**
    - A condição da linha 331 é sempre verdadeira, então o resumo aparece com a coleção vazia; a spec o esconde.
    - No erro aparecem dois ErrorStates (sm "Resumo indisponível." em 360-365 + lg); a spec pede resumo oculto e texto oficial.

26. **Textos.**
    - Título "Sua coleção" (297, 317); a spec diz "Minha coleção".
    - A busca vazia diz "Tente outro termo ou limpe a busca." (448); o texto oficial é "Tente outro termo ou limpe os filtros.".
    - "Repetid." (354; também em `perfil.tsx:223, 232`) deve ser "Repetidos".
    - "Repetido ×N" no card é caption (`CarCard.tsx:142-145`); a spec pede Badge flame.

27. **`SegmentedControl.tsx:81, 108`: itens com 36 pt de altura.**
    - Container h-11 com p-1 deixa cada item com 36 pt (< 44).
    - A11y: `radio` com `selected` em vez de `checked`, e sem "1 de 3".

28. **Botão de ordenação (`colecao.tsx:396-405`).**
    - Só ícones, sem o rótulo da ordem atual ("⇅ Recentes"): o usuário não sabe como a lista está ordenada.
    - O check do sheet é o caractere "✓" (503); usar o ícone `Check`.

### Perfil

29. **Teclado cobre o Editar perfil (`perfil.tsx:434-458`).**
    - O sheet usa `Input` com `TextInput` comum, não `BottomSheetTextInput`, então o teclado cobre campos e botões.
    - O footer não é `BottomSheetFooter` e não sobe com o teclado.
    - Sugestão: Input aceitar `as={BottomSheetTextInput}`.

30. **Rota "/" ambígua.**
    - `router.replace("/")` em Sair (`perfil.tsx:98`) e em "Voltar ao início" (`[id].tsx:215`): "/" existe tanto em `app/index.tsx` (splash) quanto em `app/(tabs)/index.tsx`, e pode reabrir o splash.
    - Usar `"/(tabs)"`, como o Header já faz (`Header.tsx:72`).

31. **"Explorar miniaturas" (`perfil.tsx:242`): 22 pt + hitSlop 8 = 38 pt (< 44).**

### Transversal

32. **`Toast.tsx:80`: Toast novo pode sumir.**
    - `hide()` agenda `setCurrent(null)` 140 ms depois. Um `show()` dentro dessa janela faz o Toast novo sumir (por exemplo, confirmar remoção seguido de outro Toast).
    - Guardar o id e só limpar se ainda for o mesmo.

33. **`Header.tsx:261-268`: polling a cada 80 ms.**
    - O `TransparentHeader` lê o SharedValue num `setInterval` de 80 ms enquanto a tela estiver aberta.
    - Trocar por `useAnimatedReaction` + `runOnJS` só na mudança de limiar.

## POLIMENTO

34. **Busca: código morto e textos.**
    - `busca.tsx:335-339`: `activeFiltersCount` é código morto, com bug de precedência de operadores.
    - `BadgeInline` (785-791) é redundante.
    - Fallback "—" nos chips (372, 391).
    - "Nenhum resultado" (509-511) duplica o EmptyState.
    - O anúncio "312 miniaturas encontradas" deve usar `announceForAccessibility`; no iOS o `liveRegion` não vale.

35. **FilterSheet e FilterChipsRow.**
    - `FilterSheet.tsx:327`: `font-sans-medium` sobrescreve a família eyebrow.
    - Série em destaque sem dot flame.
    - ErrorState dentro de ChipsRow com wrap (163).
    - `FilterChipsRow.tsx:140`: sem o fade de 16 pt nas bordas.

36. **Detalhe.**
    - Título sem role header (292).
    - Badge "Descontinuada" na linha de identidade (324); a spec o põe ao lado da Marca na ficha.
    - Badge de posição sem mono (315).
    - Ícones: Cor usa `Sparkles` em vez de `Palette`; Código usa `Tag` em vez de `Hash`.
    - "Mais da série" carregando usa caixas com ActivityIndicator (481-495) em vez de 3 `CarCardSkeleton`.
    - Tocar no texto da descrição recolhe (347).
    - Hack `void Share` (556-558).

37. **`CollectionPanel.tsx`.**
    - Linhas 42-48: altera SharedValues durante o render.
    - `scaleY` distorce o conteúdo; animar a altura.
    - Badge "Repetido" ao lado do número em vez de ao lado do título.

38. **`ColorBadge.tsx`: nunca mostra o dot.**
    - O mock usa nomes ("Azul"), então sempre cai no ícone `Palette`.
    - Mapear nome → hex para mostrar o dot. Com hex, o componente exibe o código em vez do nome.

39. **Galeria.**
    - `GalleryViewer.tsx`: sem gradientes de topo e base, sem ocultar a status bar, sem tocar para mostrar/ocultar os controles.
    - A11y deve ser "Foto n de total de {title}" (`CarGallery.tsx:112`, `GalleryViewer.tsx:89`).
    - Sem placeholder quando a imagem falha.

40. **Dialogs.**
    - `Dialog.tsx:103-105`: o backdrop não anima, e a saída não anima porque `visible` troca na hora.
    - ConfirmDialog pode ser fechado durante o loading.
    - A descrição não tem o título em negrito.
    - Haptic Warning duplicado: `ConfirmDialog.tsx:39` dispara, e `colecao.tsx:243` e `[id].tsx:187` disparam de novo.

41. **Toast.**
    - Sem os 8 s com leitor de tela ativo.
    - Sem arrastar para cima para fechar.
    - Tocar na ação não fecha o Toast.
    - "Desfazer" recria o item com `createdAt` novo, e ele pula para o topo em "Recentes".

42. **Perfil.**
    - Logo `md` 180 pt (292); a spec pede 96.
    - "Editar perfil" sem ícone `Pencil`.
    - Nome sem role header (177).
    - Descrição do LoginGate diferente de §C.16 (117).
    - E-mail vazio mostra "E-mail inválido." em vez de "Informe seu e-mail." (375).
    - Código morto (471-481).
    - RefreshControl com cores fixas (166), e refresh não está na spec.
    - Falta o crossfade de tema.
    - O estado de erro do usuário não mantém o "Sair" visível (124-145).

43. **Avatar e LoginGate.**
    - `Avatar.tsx:59`: anel `bg-flame` sólido; a spec pede gradiente flame.
    - `LoginGate.tsx:31-36`: círculo `flame-soft`; a spec pede o mesmo visual do EmptyState lg (círculo `surface-2` + arco).

44. **Animações por `setState`.**
    - `SegmentedControl.tsx:50-71`: anima com `setState` a cada frame; usar Reanimated.
    - `StatTileSkeleton` não pulsa.

45. **`QuantityStepper.tsx`.**
    - `font-mono` é sobrescrito por `font-sans-semibold` (129).
    - O número desliza 2 pt; a spec pede 8 pt.

46. **`Header.tsx:158-163`: título do `stack` centralizado também no Android.**
    - A spec pede alinhado à esquerda no Android.

## Pendências da Aquarela (docs)
- `componentes.md` §14 e spec 05 §1.2: ShareWhatsAppButton `lg` quando está na ActionBar, igualando a altura do primary (item 19).
- Aguardando a decisão do Orquestrador sobre os itens 11 e 21, que são critérios de aceite tratados como evolução no briefing.
