# Lote 02 — Busca, Detalhe do Carro, Coleção e Perfil

Conclusão do **lote 02** da fase 1. Cobriu as 4 telas que faltavam do escopo
(`docs/design/telas/04-busca-filtros.md`, `05-car-detalhe.md`, `06-colecao.md`,
`07-perfil.md`) e consolidou a base de componentes que essas telas exigiam.

## Telas entregues

| Rota | Spec | Estado |
|---|---|---|
| `app/(tabs)/busca.tsx` | `04-busca-filtros.md` | ✅ |
| `app/car/[id].tsx` | `05-car-detalhe.md` | ✅ |
| `app/(tabs)/colecao.tsx` | `06-colecao.md` | ✅ |
| `app/(tabs)/perfil.tsx` | `07-perfil.md` | ✅ |

## Componentes novos em `src/components/`

UI base (`src/components/ui/`):

| Componente | Spec § | Notas |
|---|---|---|
| `Header.tsx` | §7 | 3 variantes (`stack`, `large`, `transparent`); reage ao `scrollY` via Reanimated. |
| `BottomSheet.tsx` | §8 | Wrapper do `@gorhom/bottom-sheet` v5 com `ThemeScope`, footer fixo e back do Android. |
| `Dialog.tsx` | §9.1 | Modal centralizado com entrada fade+escala (200 ms). |
| `ConfirmDialog.tsx` | §9.2 | Dialog destrutivo com `Trash2` flame + haptic Warning. |
| `FilterChip.tsx` + `FilterChipsRow.tsx` | §12.1/12.2 | Chip toggle/dropdown/removable e a linha rolável. |
| `FilterSheet.tsx` | §12.3 | Sheet com 4 seções (Ano, Série, Marca, Atributos), rascunho + aplicar. |
| `QuantityStepper.tsx` | §C.2 | Variantes `glass` (card) e `secondary` (painel). |
| `ShareWhatsAppButton.tsx` | §14 | Botão WhatsApp → share sheet nativo como fallback. |
| `Toast.tsx` | §C.3 | Provider + `useToast()`; success/danger/info com borda esquerda colorida. |
| `Avatar.tsx` | §C.4 | 32/56/88 pt com anel flame opcional. |
| `SegmentedControl.tsx` | §C.5 | Fundo deslizante animado por JS (sem `useAnimatedStyle`). |
| `SectionHeader.tsx` | §C.7 | h2 + ação "Ver tudo". |
| `StatTile.tsx` | §C.12 | display-xl accent + caption uppercase; com `StatTileSkeleton`. |
| `ListRow.tsx` | §C.13 | Quadrado 32 + label + chevron; variante `danger`. |
| `LoginGate.tsx` | §C.16 | Fallback de Coleção/Perfil sem sessão. |
| `InfoRow.tsx` | §C.11 | Linha de atributo do detalhe (suporta `children` para `ColorBadge`). |
| `ColorBadge.tsx` | §5 | Dot hex ou ícone `Palette`. |
| `icons/WhatsAppIcon.tsx` | §14 | SVG monocromático do WhatsApp. |

Domínio (`src/components/car/`):

| Componente | Spec § | Notas |
|---|---|---|
| `CarGallery.tsx` | §15.1 | FlatList horizontal paging + dots/contador. |
| `GalleryViewer.tsx` | §15.2 | Modal em tela cheia com pager + thumbs. Sem pinch/double-tap (evolução). |
| `CollectionPanel.tsx` | §1.3 | Painel "Na sua coleção" com stepper e ConfirmDialog. |
| `CarCard.tsx` (estendido) | §4 | Adicionada variante `collection` com QuantityStepper + badge "Repetido". |
| `CarCardSkeleton.tsx` (estendido) | §11 | Adicionados `CarDetailSkeleton` e `ProfileSkeleton`. |

## Services

- `src/services/users.ts` (novo): `updateProfile({ name, email })` — atualiza o
  usuário em memória e mantém a sessão sincronizada. Adicionado ao barrel
  `src/services/index.ts`.
- `src/services/auth.ts`: exportado `state` para que `users.updateProfile`
  consiga sincronizar a sessão após salvar.

## Root layout

`app/_layout.tsx` agora envolve as rotas em `BottomSheetModalProvider`
(@gorhom) e `ToastProvider`, ambos acima do `<Stack>` para que todas as
telas tenham acesso.

## Remoções

- `src/components/ui/PlaceholderScreen.tsx` removido — sem uso após as
 4 telas serem preenchidas.

## Validação

- `npx tsc --noEmit`: **zero erros**.
- `grep TODO|FIXME` em `src/` e `app/`: **zero ocorrências**.
- `grep "@/mocks"` em `app/` e `src/components/`: **zero importes diretos**;
  toda leitura passa por `src/services/`.

## Pendências conhecidas (evoluções, não bloqueios)

1. **FilterSheet — botão "Ver todos (N)"** e busca interna em seções
   com > 20 opções. Não necessário com o mock atual (25 carros, 6 séries,
   6 marcas, 10 atributos). Estrutura do componente já prevê os 8 primeiros.
2. **GalleryViewer — pinch/double-tap/drag-to-close.** A versão da fase 1
   foca no essencial (pager, contador, thumbs, fechar). Gestos avançados
   ficam para evolução.
3. **Header transparente — sincronização glass/ghost via `requestAnimationFrame`.**
   Funciona mas não é o ideal; em produção vale migrar para um
   `useAnimatedReaction` na UI thread.
4. **Toast — `accessibilityLiveRegion="polite"` cobre leitor de tela;**
   não foi disparado `AccessibilityInfo.announceForAccessibility` manual.
5. **Coleção — busca local (título/toy/collector)** implementada via
   `getCollection({ q })`. Filtro "Repetidos" sincronizado com `dup=1`
   no params (toque no StatTile alterna). Ordenação via BottomSheet
   `dynamic` com 4 opções (recentes / nome / ano / unidades).
6. **Busca — busca por `toy` exato com badge "Código exato"** implementado;
   a spec fala em "row destacada acima do grid", e foi isso que entreguei.

## Arquivos alterados/criados (resumo)

### Criados (componentes)
- `src/components/ui/Header.tsx`
- `src/components/ui/BottomSheet.tsx`
- `src/components/ui/Dialog.tsx`
- `src/components/ui/ConfirmDialog.tsx`
- `src/components/ui/FilterChipsRow.tsx`
- `src/components/ui/FilterSheet.tsx`
- `src/components/ui/QuantityStepper.tsx`
- `src/components/ui/ShareWhatsAppButton.tsx`
- `src/components/ui/Toast.tsx`
- `src/components/ui/Avatar.tsx`
- `src/components/ui/SegmentedControl.tsx`
- `src/components/ui/SectionHeader.tsx`
- `src/components/ui/StatTile.tsx`
- `src/components/ui/ListRow.tsx`
- `src/components/ui/LoginGate.tsx`
- `src/components/ui/InfoRow.tsx`
- `src/components/ui/ColorBadge.tsx`
- `src/components/ui/icons/WhatsAppIcon.tsx`
- `src/components/car/CarGallery.tsx`
- `src/components/car/GalleryViewer.tsx`
- `src/components/car/CollectionPanel.tsx`

### Criados (services)
- `src/services/users.ts`

### Editados
- `app/_layout.tsx` (Toast + BottomSheet providers)
- `app/(tabs)/busca.tsx` (placeholder → implementação completa)
- `app/(tabs)/colecao.tsx` (placeholder → implementação completa)
- `app/(tabs)/perfil.tsx` (placeholder → implementação completa)
- `app/car/[id].tsx` (placeholder → implementação completa)
- `src/components/car/CarCard.tsx` (variante `collection`)
- `src/components/car/CarCardSkeleton.tsx` (`CarDetailSkeleton`, `ProfileSkeleton`)
- `src/components/ui/InfoRow.tsx` (suporte a `children`)
- `src/components/ui/ListRow.tsx` (`accessibilityHint`)
- `src/services/auth.ts` (exportação de `state`)
- `src/services/index.ts` (re-export de `users`)

### Removidos
- `src/components/ui/PlaceholderScreen.tsx`

### Dependências
- Instalado `expo-clipboard` (necessário para `InfoRow copyable` —
  spec §C.11). Instalado via `npx expo install expo-clipboard`.
