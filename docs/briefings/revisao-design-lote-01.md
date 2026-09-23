# Revisão de design — Lote 01 (Aquarela)

Escopo: Onboarding, Login, Home, TabBar, componentes. Correções a cargo do Forja, depois das telas do lote 02.

## Decisões do Orquestrador

- **Item 17:** na fase 1 a nota e o link "Preencher dados de exemplo" do login aparecem **sempre**, não só em `__DEV__`. Motivo: a fase 1 é de mockups e o login é simulado.
- **Item 9 (corpo do CarCard em 94 pt):** a Aquarela atualiza `componentes.md` §4 e o DS §6.2.

## BLOQUEANTE
1. src/components/ui/SearchBar.tsx:66-71 — o modo trigger tem um Pressable aninhado com string crua ({placeholder}). No nativo isso quebra ("Text strings must be rendered within <Text>") e o Pressable interno sem onPress engole o toque. Corrigir: um único Pressable com <Text variant="body">.
2. src/components/ui/ScreenContainer.tsx:42 — a StatusBar é sempre "dark" fora do ink. A Home tem o topo ink, então os ícones ficam escuros sobre fundo escuro, e isso vaza para o modal de login. Corrigir: Home "light"; nas demais, "light" no dark e "dark" no light.
3. src/theme/ThemeProvider.tsx:62 — c() resolve pelo tema global e ignora o ThemeScope. No light, sobre ink:
   - login: o olho da senha (IconButton.tsx:56 via Input.tsx:98) fica invisível; placeholder e ícone (Input.tsx:74,89) ficam com baixo contraste
   - Skeleton.tsx:47 sai claro na faixa ink
   - TabBar (_layout.tsx:54-56): ativo #B85600 sobre ink e borda clara sobre ink
   Corrigir: ThemeScope provê um ThemeContext aninhado (c() herda). TabBar ativo = primary #FD8401.
4. app/onboarding.tsx:80 — bg-ink sem ThemeScope. No light, as ilustrações ficam claras. Corrigir: ThemeScope dark / ScreenContainer bg="ink".
5. app/(tabs)/index.tsx:375-389 — o carrossel de séries é uma View flex-row, sem scroll. Corrigir: ScrollView/FlatList horizontal, snapToInterval 292, padding 16, peek. Com 1 série: largura − 32.
6. Safe area com valor fixo (index.tsx:268, onboarding.tsx:80, login.tsx:165, onboarding.tsx:135). Corrigir: insets.top (+8 no Pular/X) e insets.bottom+16 no CTA. No modal pageSheet do iOS o X não leva inset.
7. O badge da tab Coleção não atualiza ao tocar no coração (_layout.tsx:25-36, index.tsx:62,215). Corrigir: store/contexto de coleção compartilhado. Serve também para a tela Coleção e o Detalhe.

## IMPORTANTE
8. Toque < 44 pt:
   - Button sm sem hitSlop 4 (Button.tsx:37,153-167)
   - avatar de 32 pt (index.tsx:272-278)
   - "Ver tudo" (index.tsx:332) e "Preencher dados de exemplo" (login.tsx:260-265): usar min-h-11
9. Grid (index.tsx:180,191):
   - gutter de tela 16
   - gap 12 horizontal e vertical
   - CarGridSkeleton com a mesma geometria do grid (CarCardSkeleton.tsx:30-32)
   - CarCard: título com minHeight de 2 linhas e corpo fixo de 94 (CarCard.tsx:135-150)
10. Home: incluir o SectionHeader "Miniaturas · N itens" e a barra compacta ao rolar (logo 72 + IconButton Search), conforme spec 03 §1.
11. Erro das séries (index.tsx:343-348,80): ErrorState sm com o texto oficial, sem err.message cru.
12. Pull-to-refresh (index.tsx:184):
   - refreshing deve ser um estado real
   - em erro no refresh, manter o conteúdo + Toast danger "Não foi possível atualizar."
   - "Carregando mais" com 2 CarCardSkeleton
13. CarCard.tsx:83-85: sem quantity, o a11y deve dizer ", na sua coleção" (não "0 unidades").
14. CarCard.tsx:171-179: fallback onError na imagem; recyclingKey = car.id.
15. Coração:
   - sem sessão, não fazer pop/haptic antes do login (FavoriteButton.tsx:67-83)
   - Toast "Adicionada à sua coleção." com a ação "Ver"
   - rollback com Toast + haptic Error
   - ignorar toques repetidos
   - ConfirmDialog se quantity > 1
16. Login:
   - try/catch no signIn (login.tsx:108) + banner "Não foi possível entrar agora…"
   - Toast danger se a ação pendente falhar
   - Toast de sucesso
   - bloquear gesto/back durante o envio
   - Input com forwardRef: autoFocus no e-mail, "next" pula para a senha, focar o 1º campo inválido
17. Ver a decisão acima: exibir sempre na fase 1.
18. Layout do login:
   - topo ~30% da altura
   - gradiente radial primary/12
   - marca d'água em 140% da largura
   - topo encolhe com o teclado
   - maxWidth 440
   - StatusBar light
   - accessibilityViewIsModal
   - título com role header
19. onboarding.tsx:82-93: o "Pular" no último slide com opacity 0 ou posição absoluta, sem salto.
20. Ilustrações do onboarding (156-243):
   - usar os componentes reais: CarCard, stepper "− 2 +", FavoriteButton, WhatsAppIcon + "Compartilhar"
   - sem cores fixas
21. Onboarding:
   - indicador ativo com gradiente flame
   - ilustração com 45% da altura
   - regra para telas < 640 pt
22. TabBar custom (spec §6):
   - blur ink/85
   - indicador flame 16×2
   - ícones ativos com fill
   - teto "99+"
   - a11y "Coleção, N itens"
   - tocar em Início rola ao topo
23. Home: padding inferior contado em dobro (index.tsx:46 + ScreenContainer edges bottom).
24. Button flame com glow(); press scale 0.97/0.98 em Button, CarCard e SeriesCard.

## POLIMENTO
25. index.tsx:356 — a linha da base da faixa ink deve ser gradiente flame com 30%.
26. "Ver tudo" deve ir para /busca?open=serie e ter ChevronRight 16.
27. Avatar da Home:
   - usar Avatar.tsx
   - usuário logado sem nome não pode ver "Entrar"
   - ternário da saudação redundante (303-305)
28. CarCard.tsx:97 — elevation e1 no light.
29. Input:
   - anel de foco primary/15
   - AlertCircle no erro
   - anúncio para o leitor de tela
   - banner do login com border-flame/40 + anúncio
30. Button:
   - aplicar o tom muted do ghost
   - o loading deve travar a largura
31. EmptyState.tsx:72-86:
   - arco com gradiente flame
   - o bloco deve ser um único elemento acessível
32. SeriesCard: prop description sem uso.
33. Onboarding:
   - Dimensions fora do módulo
   - título com role header
   - texto "Passo X de 3"
   - back do Android por slide
   - parallax
   - CTA com gutter 24
34. Login com sessão via deep link renderiza o formulário por 1 frame (73-77).
