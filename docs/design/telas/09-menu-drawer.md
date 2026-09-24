# 09 — Menu (drawer) e header das telas raiz

| | |
|---|---|
| Decisão | Do usuário (`ESPECIFICACAO-MOBILE.md`, "Navegação futura"): **as abas saem e entra um menu hambúrguer (drawer)**, para ganhar espaço na tela e para que funcionalidades novas entrem só como itens do menu. Análise de apoio: `docs/design/navegacao-fase2.md`. |
| Rotas | grupo `app/(drawer)/` com `<Drawer>` do `expo-router/drawer`: `index` (Início), `busca`, `colecao`, `perfil`. O Detalhe `car/[id]` continua no Stack raiz, **fora** do drawer. |
| Acesso | exige sessão (guarda única, ver `README.md`) |
| Tema | drawer e headers seguem o tema (light/dark); a Home continua com o topo ink |
| Critério | enxuto: funciona, certo nos dois temas, safe area, textos oficiais, toque de 44 pt, a11y. **Nenhuma animação além da nativa do drawer.** |

## 1. Header padrão das telas raiz (`Header variant="root"`)

Substitui o Header `large` e o HomeHeader nas 4 telas raiz. É uma variante nova do componente `Header` (componentes §7).

```
┌───────────────────────────────────────────┐
│ (≡)  Título                          (🔍) │  52 pt + insets.top
└───────────────────────────────────────────┘
  │     │                               └─ ação contextual (opcional, até 1 IconButton)
  │     └─ título h3 font-display, 1 linha, alinhado à esquerda (iOS e Android); na Home: Logo sm (96 pt)
  └─ IconButton ghost "Menu" (ícone Menu 24), 44×44 pt, 4 pt da borda esquerda
```

- **Altura:** 52 pt + `insets.top`. O fundo pinta a área da status bar.
- **Fundo:** `bg-surface` + `border-b border-border` no dark, ou `elevation("e2")` no light. Na Home o header é **ink** (`ThemeScope dark`) e continua a faixa ink da tela.
- **Menu:**
  - `IconButton` (`size="lg"`, 44 pt, ícone `Menu` 24);
  - `accessibilityLabel="Abrir menu"`, `accessibilityHint="Mostra as seções do app"`;
  - `accessibilityState={{ expanded: drawerAberto }}`.
- **Título:** `h3` com `font-display` e cor `fg` (na Home não há título: vai a `Logo size="sm"`); `accessibilityRole="header"`.
- **Ação contextual à direita:** no máximo 1 `IconButton` de 44 pt; quando a tela não tem ação, fica um espaçador de 44 pt para o título não pular.
- **Status bar:** `light` na Home (ink); nas demais, `light` no dark e `dark` no light.
- O header **não colapsa** (colapso com rolagem é fase 1.5).

| Tela | Título | Ação à direita |
|---|---|---|
| Início | Logo sm (sem texto) | `Search` → `router.navigate("/busca?focus=1")`, label "Buscar miniaturas" |
| Buscar | "Buscar" | nenhuma |
| Minha coleção | "Minha coleção" | nenhuma (ordenação continua no corpo da tela) |
| Perfil | "Perfil" | nenhuma |

## 2. O drawer

```
┌──────────────────────────────┐░░░░░░░░░
│ insets.top + 16              │░ overlay
│ ╭──╮                         │░ ink/70
│ │AS│  Ana Souza           ›  │░ (toque
│ ╰──╯  ana@email.com          │░  fecha)
├──────────────────────────────┤░
│ ▌⌂  Início                   │░  item ativo: bg-primary-soft + barra 3 pt primary
│  🔍 Buscar                    │░             + ícone e texto primary-text
│  ♥  Minha coleção            │░
│  👤 Perfil                    │░
│                              │░
│            (espaço)          │░
│                              │░
├──────────────────────────────┤░
│  ⎋  Sair                     │░  ListRow danger
│     Versão 1.0.0             │░  caption fg-subtle
│ insets.bottom + 12           │░
└──────────────────────────────┘░
   largura: min(80% da tela, 320 pt)
```

### 2.1 Painel
- `drawerType="front"` (o painel desliza **sobre** a tela), lado esquerdo.
- Largura: `Math.min(width * 0.8, 320)`.
- Fundo `bg-surface`, seguindo o tema. No dark, borda direita `border-border` hairline; no light, `elevation("e3")`.
- Conteúdo custom via `drawerContent`, envolvido em `ThemeScope` **com o esquema atual** (não fixar em dark; ver bloqueante 2 da revisão do lote 02).
- Safe area: topo `insets.top + 16`, base `insets.bottom + 12`.

### 2.2 Cabeçalho do usuário
- `Pressable` na largura toda, `min-h-[72px]`, `px-4 py-3`, pressed `bg-surface-3`.
- Conteúdo:
  - `Avatar` 56 (iniciais; sem nome, ícone `User`);
  - nome em `h3` (1 linha; sem nome, mostra o e-mail);
  - e-mail em `body-sm fg-muted` (1 linha, truncado);
  - `ChevronRight` 18 `fg-subtle` à direita.
- Tocar: fecha o drawer e navega para `/perfil`.
- A11y: `accessibilityRole="button"`, label "{nome}, {e-mail}. Abrir perfil".
- Divisória `border-b border-border` abaixo.

### 2.3 Itens (só o que existe hoje)

| Ordem | Item | Ícone (lucide) | Rota |
|---|---|---|---|
| 1 | Início | `Home` | `/(drawer)` (index) |
| 2 | Buscar | `Search` | `/busca` |
| 3 | Minha coleção | `Heart` | `/colecao` |
| 4 | Perfil | `User` | `/perfil` |

- Cada item: `Pressable` `flex-row items-center gap-3 min-h-12 mx-3 px-3 rounded-md`, ícone 22 + label `body font-sans-medium`.
- **Inativo:** ícone `fg-muted`, texto `fg`; pressed `bg-surface-3`.
- **Ativo:** `bg-primary-soft` + barra vertical de 3×20 pt `bg-primary` à esquerda + ícone e texto `primary-text` (`font-sans-semibold`); `accessibilityState={{ selected: true }}`.
- Espaço de 4 pt entre itens (os alvos de 48 pt não se encostam).
- **Proibido:** item de funcionalidade que ainda não existe, "Em breve", item desabilitado. Sem botão morto.

### 2.4 Rodapé
- Fixo na base do painel, separado por `border-t border-border`.
- `ListRow variant="danger"` **"Sair"** (ícone `LogOut`), `showChevron={false}`, `accessibilityHint="Encerra a sessão neste aparelho"`.
- Tocar em Sair:
  1. fecha o drawer;
  2. abre o **ConfirmDialog atual** com:
     - título "Sair da sua conta?";
     - texto "Você vai precisar entrar de novo para ver sua coleção.";
     - `confirmLabel="Sair"`, cancelar "Cancelar";
     - ícone `LogOut` (o ConfirmDialog ganha uma prop `icon` com padrão `Trash2`);
  3. ao confirmar: `account.deleteSession("current")` → limpa o estado local → `router.replace("/login")`.
  4. erro: Toast danger "Não foi possível sair agora.".
- **O mesmo diálogo** é usado pelo "Sair" do Perfil (`07-perfil.md` §5), com um único texto.
- Abaixo do Sair: `caption fg-subtle` "Versão {expoConfig.version}", `px-4 pt-2`, não interativo.

### 2.5 Como um item novo entra depois
1. A tela precisa **existir e funcionar** (spec aprovada, implementada e revisada no lote). Só então o item aparece.
2. Os itens vêm de **uma única lista de configuração** (ex.: `src/navigation/drawerItems.ts`):
   ```ts
   type DrawerItem = {
     route: Href;              // rota dentro de (drawer)/
     label: string;            // texto do menu (verbo ou substantivo curto)
     icon: LucideIcon;
     section?: "principal" | "comunidade" | "conta"; // opcional, ver regra 4
     badge?: () => number;     // opcional: contador (ex.: notificações não lidas)
   };
   ```
   Adicionar a tela = criar a rota em `app/(drawer)/` + 1 linha nessa lista. O drawer e o header não mudam.
3. **Ordem:** por frequência de uso. Os 4 atuais continuam no topo, na ordem de hoje.
4. **Seções:** com mais de 6 itens, agrupar com um título `eyebrow fg-subtle` por seção (ex.: PRINCIPAL · COMUNIDADE · CONTA). Até 6 itens, a lista fica simples, sem títulos.
5. **Contador:** um item pode mostrar um `Badge count` à direita (máx. "99+"), por exemplo Notificações. Label de a11y: "{label}, {n} novas".
6. Candidatos já mapeados (entram **só** quando existirem): Séries, Estatísticas, Novidades, Notificações, Clube de Troca, Garagens (`navegacao-fase2.md` §2.3).

## 3. Comportamento

| Situação | Comportamento |
|---|---|
| Abrir | toque no `≡` do header **ou** gesto a partir da borda esquerda (`swipeEdgeWidth` 24 pt, para não brigar com carrosséis e chips horizontais) |
| Gesto habilitado | só nas 4 telas raiz; no Detalhe (stack) não existe drawer, e o gesto de borda do iOS continua sendo "voltar" |
| Fechar | toque no overlay, arrastar o painel para a esquerda, tocar em um item, back do Android |
| Navegar por um item | fecha o drawer e troca de tela (`navigate`, sem empilhar raiz sobre raiz) |
| Toque no item **da tela atual** | fecha o drawer; **opcional:** rola a lista ao topo (Home, Busca, Coleção) |
| Back do Android com o drawer aberto | fecha o drawer (não sai da tela) |
| Back do Android com o drawer fechado, numa raiz que não é o Início | vai para o Início (`backBehavior="initialRoute"`); no Início, sai do app |
| Overlay | `overlayColor` = ink com 70% de opacidade (`rgba(11,11,13,0.7)`) **nos dois temas** |
| Teclado aberto (Busca) | abrir o drawer fecha o teclado (`Keyboard.dismiss()`) |
| Animação | só a nativa do drawer. Nada de escala, blur ou parallax. Com movimento reduzido, mantém a padrão da biblioteca. |
| Leitor de tela | ao abrir, o foco vai para o cabeçalho do usuário; o conteúdo atrás fica oculto (`accessibilityViewIsModal` / `importantForAccessibility`); "Fechar menu" disponível como ação escape (iOS: gesto Z) |

## 4. O que muda em cada tela

| Tela | Muda | Continua |
|---|---|---|
| **Início** (`03-home.md`) | `Header root` ink com `≡` + Logo sm + `Search` à direita, no lugar do HomeHeader (logo + avatar). O avatar sai do header (o usuário está no cabeçalho do drawer). A barra compacta que aparecia ao rolar deixa de existir: o header root é fixo. | saudação, SearchBar trigger, séries em destaque, grid |
| **Buscar** (`04-busca-filtros.md`) | `Header root` "Buscar" no lugar do Header `large` | SearchBar, chips, filtros, resultados |
| **Minha coleção** (`06-colecao.md`) | `Header root` "Minha coleção" no lugar do Header `large`. O subtítulo "N miniaturas · M modelos" sai do header; os StatTiles do resumo já mostram esses números. | resumo, busca, Todos/Repetidos, ordenação, grid |
| **Perfil** (`07-perfil.md`) | `Header root` "Perfil" no lugar do Header `large`. "Sair" usa o mesmo ConfirmDialog do drawer (§2.4). | identidade, resumo, tema, conta, alterar senha |
| **Detalhe** (`05-car-detalhe.md`) | nada: stack com voltar (Header `transparent`), sem drawer e sem gesto de menu | tudo |
| **Todas as raiz** | padding inferior das listas: `insets.bottom + 24` (não soma mais a altura da TabBar) | — |

## 5. O que sai

- **TabBar** inteira (componentes §6): barra, ícones, indicador, label "Entrar", `tabBarHideOnKeyboard`.
- **Badge** da aba Coleção (já removido na fase 2) e qualquer contador na navegação, até existir um item com `badge` (§2.5).
- `screenListeners.tabPress` e o "tocar na aba ativa rola ao topo" (substituído pelo opcional do §3).
- `useBottomTabBarHeight()` e os paddings `56 + insets.bottom + 24` nas listas.
- **HomeHeader** (componentes §7) e a barra compacta da Home.
- Header `large` nas telas raiz. O componente pode ficar para uso futuro, mas nenhuma tela o usa.
- Rotas do grupo `(tabs)`: passam para `(drawer)`. Todo `router.replace("/(tabs)")` vira `router.replace("/(drawer)")`.

## 6. Acessibilidade (resumo)
- Botão de menu com 44 pt, label "Abrir menu" e estado `expanded`.
- Itens com `accessibilityRole="button"` e `selected` no ativo, alvos de 48 pt com 4 pt entre eles.
- Contraste: item ativo `primary-text` sobre `primary-soft` nos dois temas (≥ 4,5:1, DS §3.2).
- "Sair" com hint; a versão não é interativa.

## 7. Critérios de aceite
- [ ] As 4 telas raiz têm o header com o menu (44 pt) à esquerda e título ou logo; a Home tem busca à direita.
- [ ] O drawer abre pelo botão e pelo gesto de borda; fecha pelo overlay, pelo arraste, ao navegar e pelo back do Android.
- [ ] Cabeçalho com avatar, nome e e-mail leva ao Perfil.
- [ ] Só 4 itens (Início, Buscar, Minha coleção, Perfil), com o ativo destacado em primary; nenhum item sem tela.
- [ ] "Sair" pede confirmação (ConfirmDialog) e leva ao Login; a versão aparece no rodapé.
- [ ] Largura de 80% até 320 pt; overlay ink; certo nos temas light e dark; safe area no topo e na base.
- [ ] Nenhuma TabBar em lugar algum; o Detalhe continua em stack com voltar.
- [ ] Adicionar um item novo exige só a rota + 1 linha na lista de itens.
