# ToSave Mobile — Design (fases 1 e 2)

Specs de design do **app do colecionador** (Expo + expo-router + NativeWind). Fonte de requisitos: `docs/ESPECIFICACAO-MOBILE.md`.

| Documento | Conteúdo |
|---|---|
| `design-system-mobile.md` | Tokens (`tailwind.config.js` do NativeWind), temas light/dark, tipografia, densidade, toque de 44 pt, safe area, elevação nativa, motion, estados globais |
| `componentes.md` | Catálogo de componentes com props, anatomia, estados e acessibilidade |
| `telas/01-onboarding-splash.md` | Splash e onboarding |
| `telas/02-login.md` | **Fase 2:** Login como tela de entrada (app travado sem sessão), link "Criar conta"; proposta de "Esqueci minha senha" |
| `telas/03-home.md` | Home: séries em destaque, busca rápida, grid |
| `telas/04-busca-filtros.md` | Busca e filtros (ano, série, marca, atributos) |
| `telas/05-car-detalhe.md` | Detalhe premium do carro |
| `telas/06-colecao.md` | Coleção do usuário, quantidade, repetidos |
| `telas/07-perfil.md` | Perfil do colecionador |
| `telas/08-cadastro.md` | **Fase 2:** Cadastro pelo app (nome, e-mail, senha), erros oficiais do Appwrite |
| `telas/09-menu-drawer.md` | **Menu hambúrguer (drawer)** no lugar das abas + Header `root` das telas raiz; como um item novo entra no menu |
| `navegacao-fase2.md` | Inventário do app atual do usuário e funcionalidades candidatas a itens do menu |

> **Fase 2: app travado por login.** O mapa e as regras abaixo já descrevem a fase 2. Na fase 1 o app era navegável sem conta e o login era um modal pedido sob demanda; esse modelo está substituído.
>
> **Navegação por menu (drawer):** as abas saíram (decisão do usuário, 24/09/2026). As telas raiz ficam no grupo `(drawer)` e usam o Header `root` com o botão de menu (`telas/09-menu-drawer.md`). Não existe mais TabBar.

Referência visual herdada (não editar, é do portal web pausado): `docs/referencia-web/`.

## Mapa de navegação (expo-router)

```
app/
├─ _layout.tsx            Root: fontes, SplashScreen, SafeAreaProvider, GestureHandlerRootView,
│                         ThemeProvider, BottomSheetModalProvider, ToastProvider, SessionProvider, <Stack>
├─ index.tsx              Boot/splash animado → decide a rota inicial (replace) conforme sessão e onboarding
├─ onboarding.tsx         3 slides; só na primeira abertura                                  público
├─ login.tsx              Login, tela de entrada (stack normal, sem modal) → "/login?email=&reason=expired"   público
├─ cadastro.tsx           Cadastro (nome, e-mail, senha) → "/cadastro"                        público
├─ (drawer)/              ── tudo daqui para baixo exige sessão ──
│  ├─ _layout.tsx         <Drawer> (expo-router/drawer) com drawerContent custom; guarda de sessão: sem sessão → replace("/login")
│  ├─ index.tsx           Início          → "/(drawer)"          Header root: ≡ · Logo · 🔍
│  ├─ busca.tsx           Busca e filtros → "/busca?q=&year=&serie=&brand=&attr=&focus=1&open="   Header root "Buscar"
│  ├─ colecao.tsx         Minha coleção   → "/colecao?q=&dup=1"   Header root "Minha coleção"
│  └─ perfil.tsx          Perfil          → "/perfil"             Header root "Perfil"
└─ car/
   └─ [id].tsx            Detalhe do carro (Stack sobre o drawer, sem menu, com voltar) → "/car/123"    exige sessão
```

Rotas públicas: `index` (splash), `onboarding`, `login` e `cadastro`. Todas as outras exigem sessão. A guarda fica num só lugar (root `_layout.tsx`, ou um grupo `(app)` com o seu `_layout`), nunca repetida por tela.

```
            ┌──────────┐  1ª vez   ┌────────────┐
  abrir ──▶ │  index   │─────────▶ │ onboarding │── Começar / Pular (replace) ──┐
            │ (splash) │           └────────────┘                               │
            └──┬────┬──┘                                                        │
    com sessão │    │ sem sessão                                                │ sem sessão
               │    ▼                                                           ▼
               │  ┌─────────┐  "Criar conta" (push)   ┌──────────┐
               │  │  login  │ ──────────────────────▶ │ cadastro │
               │  │ (raiz)  │ ◀────────────────────── │          │
               │  └────┬────┘  "Entrar" / voltar       └────┬─────┘
               │       │ entrar (replace)                   │ conta criada + sessão (replace)
               ▼       ▼                                    ▼
     ┌──────────────────── (drawer) · telas raiz com Header root (≡) ───────────────────┐
     │  Início      Buscar      Minha coleção      Perfil                                  │
     └────┬───────────┬──────────────┬──────────────────────────────────────────────────┘
          │ card      │ card         │ card
          ▼           ▼              ▼
                  car/[id]  (push; "Mais da série" faz push de outro car/[id])

     ≡ / gesto de borda ──▶ ┌── drawer (80%, máx. 320 pt) ──────────┐
                            │ [avatar · nome · e-mail] ──▶ Perfil    │
                            │ Início · Buscar · Minha coleção · Perfil│  item ──navigate──▶ tela raiz (fecha o menu)
                            │ ─────────────────────────────────────  │
                            │ Sair ──ConfirmDialog──replace──▶ login │
                            │ Versão x.y.z                           │
                            └────────────────────────────────────────┘

  qualquer tela protegida + 401 (sessão expirada/revogada) ──replace──▶ login?reason=expired
  e-mail já cadastrado no Cadastro ──"Entrar com este e-mail" (replace)──▶ login?email=…
  conta criada, sessão falhou ──replace──▶ login?email=… (aviso "Conta criada. Entre para continuar.")
```

**Regras**
- **App travado:** sem sessão só existem splash, onboarding, login e cadastro. Todas as outras rotas exigem sessão.
- **Guarda de sessão:** num único ponto. Sem sessão, qualquer rota protegida faz `router.replace("/login")`; com sessão, `login` e `cadastro` fazem `router.replace("/(drawer)")`. Nada de guarda por tela nem de `LoginGate`.
- **Login é raiz:** entra sempre por `replace`, nunca por `push`. O back do Android no Login sai do app. O Cadastro é o único `push` a partir do Login, e seu voltar retorna ao Login.
- **Entrar no app** (login ou cadastro com sucesso) faz `router.replace("/(drawer)")`: o voltar nunca retorna a Login ou Cadastro.
- **Sair** (rodapé do drawer ou Perfil, mesmo ConfirmDialog) → `account.deleteSession("current")` → limpa estado local (coleção, cache) → `router.replace("/login")`. Tema e `onboarding.seen` ficam.
- **Sessão expirada:** `401` do Appwrite em qualquer tela protegida → limpa estado local → `router.replace("/login?reason=expired")`.
- **Deep links** (`scheme: "tosave"`): `tosave://car/123` abre o detalhe se houver sessão. Sem sessão cai no Login; retomar o deep link depois de entrar é fase 1.5.
- Splash e onboarding usam `router.replace` (o voltar nunca retorna a eles).
- Estado de busca, filtros e "repetidos" vive nos **search params** (`router.setParams`), então o voltar do detalhe restaura a lista exata.
- Headers: `headerShown: false` no Stack e no Drawer; cada tela renderiza seu `Header` (componentes §7): `root` nas 4 telas do drawer, `transparent` no Detalhe.
- **Menu:** abre pelo `≡` ou pelo gesto da borda esquerda (só nas telas raiz); fecha ao navegar, no overlay e no back do Android. Itens novos entram só quando a tela existe, por 1 linha na lista de itens (`telas/09-menu-drawer.md` §2.5). Login e Cadastro não têm Header (Cadastro tem só o voltar glass).
- Animações de stack: detalhe com `animation: "slide_from_right"`, `gestureEnabled: true`, `fullScreenGestureEnabled: true` (iOS). Login e Cadastro com a animação padrão do Stack (**sem** `presentation: "modal"`).
- **Obrigatório antes de publicar nas lojas (fora da fase 2):** "Esqueci minha senha", "Excluir conta" e Termos/Privacidade (ver `ESPECIFICACAO-MOBILE.md`). Não aparecem no mapa até existirem.

## Contrato de dados das telas (`src/services/`)

As telas chamam só isto. Hoje leem `src/mocks/`; na fase 2 viram chamadas à API. Formatos seguem o modelo da especificação.

| Função | Retorno | Usada em |
|---|---|---|
| `auth.signIn(email, password)` | `Promise<User>` (rejeita com `AuthError` "invalid_credentials") | Login |
| `auth.getDemoCredentials()` | `Promise<{ email; password }>` (só fase 1, login simulado) | Login |
| `auth.signOut()` / `auth.getSession()` | `Promise<void>` / `Promise<User \| null>` | Perfil / boot, `useRequireSession` |
| `users.updateProfile({ name, email })` | `Promise<User>` | Perfil |
| `cars.list({ q?, years?, serieId?, brandId?, attributeIds?, page?, pageSize? })` | `Promise<{ items: CarListItem[]; total: number; page: number }>` | Home, Busca |
| `cars.count(filters)` | `Promise<number>` | "Ver N resultados" do FilterSheet |
| `cars.get(id)` | `Promise<CarDetail>` (car + brand + serie + attributes + images) | Detalhe |
| `cars.listBySerie(serieId, { excludeId, limit })` | `Promise<CarListItem[]>` | "Mais da série" |
| `series.list({ featured? })` | `Promise<Serie[]>` | Home, filtros |
| `brands.list()` / `attributes.list()` / `cars.years()` | opções de filtro | Filtros |
| `collection.list({ q?, duplicatesOnly? })` | `Promise<CollectionEntry[]>` (item + car) | Coleção |
| `collection.summary()` | `Promise<{ items: number; models: number; duplicates: number }>` (só com sessão) | TabBar, Coleção, Perfil |
| `collection.add(carId)` / `collection.setQuantity(itemId, n)` / `collection.remove(itemId)` | `Promise<CollectionItem \| void>` | CarCard, Detalhe, Coleção |

`CarListItem` = `Car` + `brandName` + `serieTitle` (o que o CarCard precisa). Um store leve (Context ou Zustand) guarda o mapa `carId → CollectionItem` para o coração e o stepper refletirem o mesmo estado em todas as telas. Sem sessão, o store fica vazio e nenhuma função de `collection` é chamada.

## Decisões e pendências

Ver `design-system-mobile.md` §15.
